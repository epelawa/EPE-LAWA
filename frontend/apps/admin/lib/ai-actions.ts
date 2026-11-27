"use server";

import { cookies } from "next/headers";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { adminRedirect as redirect } from "./admin-redirect";
import { adminHref } from "./admin-path";
import { createStaffClient } from "./supabase";
import { readAdminSessionFromCookies } from "./supabase-access";
import { AI_CAPABILITIES, MAX_MODELS_PER_JOB, MODEL_JOBS, normaliseJobModels } from "../../main/lib/ai/settings";
import { cleanNewsTimes, NEWS_LIMITS } from "../../main/lib/ai/news-schedule";
import { loadFreeModels } from "../../main/lib/ai/openrouter";
import { runAutopilotPass, AI_JOB_LABELS } from "../../main/lib/ai/runner";
import { formAdminClient } from "../../main/lib/form-server";
import { sendAiEnquiryReply, type Enquiry } from "../../main/lib/ai/jobs/enquiries";
import type { AiJob } from "../../main/lib/ai/activity";

/** Only the two primary administrators may steer the AI (same check as Roles and the Cron token). */
async function primaryAdmin() {
  const db = await createStaffClient();
  const check = await db.rpc("staff_roles_authorized");
  if (check.error || check.data !== true) return null;
  const session = readAdminSessionFromCookies((await cookies()).getAll().map(({ name, value }) => ({ name, value })));
  return { db, userId: session?.user?.id ?? null };
}

function lagosLocalToIso(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  // <input type="datetime-local"> is entered in Lagos time (WAT, UTC+1, no daylight saving).
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00+01:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function time(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value) ? value : null;
}

function bounded(value: FormDataEntryValue | null, min: number, max: number, fallback: number): number {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
}

/**
 * A dropdown with a "Custom…" choice. A custom number (times its unit, for
 * the interval) must be a whole number inside the limits, otherwise the save
 * is refused instead of quietly using something else.
 */
function chosen(form: FormData, name: string, limits: { min: number; max: number }, fallback: number): number | null {
  const picked = form.get(name);
  if (picked !== "custom") return bounded(picked, limits.min, limits.max, fallback);
  const raw = Number(form.get(`${name}_custom`));
  const unit = ({ minutes: 1, hours: 60, days: 1440 } as Record<string, number>)[String(form.get(`${name}_unit`) ?? "minutes")] ?? 1;
  const value = raw * unit;
  return Number.isInteger(value) && value >= limits.min && value <= limits.max ? value : null;
}

const back = (result: string) => `${adminHref("/ai-scheduler")}?result=${encodeURIComponent(result)}`;

export async function saveAiSettings(form: FormData): Promise<void> {
  const admin = await primaryAdmin();
  if (!admin) return await redirect(back("denied"));
  const autoOn = lagosLocalToIso(form.get("auto_on_at"));
  const autoOff = lagosLocalToIso(form.get("auto_off_at"));
  if ((autoOn && Date.parse(autoOn) <= Date.now()) || (autoOff && Date.parse(autoOff) <= Date.now())) return await redirect(back("past-time"));
  const start = time(form.get("daily_start"));
  const stop = time(form.get("daily_stop"));
  const scheduleEnabled = form.get("schedule_enabled") === "on";
  if (scheduleEnabled && (!start || !stop || start === stop)) return await redirect(back("window"));
  const capabilities = Object.fromEntries(AI_CAPABILITIES.map(({ key }) => [key, form.get(`cap_${key}`) === "on"]));
  const reason = typeof form.get("reason") === "string" ? String(form.get("reason")).trim().slice(0, 500) : "";
  const interval = chosen(form, "news_interval_minutes", NEWS_LIMITS.interval, 60);
  const perRun = chosen(form, "articles_per_run", NEWS_LIMITS.articles, 1);
  const budget = chosen(form, "daily_request_budget", NEWS_LIMITS.budget, 50);
  const pushes = chosen(form, "push_daily_limit", NEWS_LIMITS.push, 3);
  if (interval === null || perRun === null || budget === null || pushes === null) return await redirect(back("custom"));
  const newsTimes = form.get("news_mode") === "times" ? cleanNewsTimes(form.getAll("news_time")) : [];
  if (form.get("news_mode") === "times" && !newsTimes.length) return await redirect(back("times"));
  const { error } = await admin.db.rpc("ai_admin_save", {
    p_autopilot: form.get("autopilot") === "on",
    p_schedule_enabled: scheduleEnabled,
    p_daily_start: start,
    p_daily_stop: stop,
    p_auto_on_at: autoOn,
    p_auto_off_at: autoOff,
    p_news_interval: interval,
    p_articles_per_run: perRun,
    p_daily_budget: budget,
    p_push_daily_limit: pushes,
    p_capabilities: capabilities,
    p_reason: reason,
  });
  // Set times (or none) are saved with the rest; this also clears any stories owed under the old settings.
  const schedule = error ? null : await admin.db.rpc("ai_news_schedule_save", { p_news_times: newsTimes });
  revalidatePath(adminHref("/ai-scheduler"));
  return await redirect(back(error || schedule?.error ? "failed" : "saved"));
}

/**
 * Per-job model choices, in order. Each pick must be in OpenRouter's live free
 * list (or already saved, so a briefly unlisted model is not silently dropped).
 * Empty choices are dropped; duplicates keep their first position.
 */
export async function saveAiModels(form: FormData): Promise<void> {
  const admin = await primaryAdmin();
  if (!admin) return await redirect(back("denied"));
  const service = formAdminClient();
  const [list, current] = await Promise.all([
    loadFreeModels(service),
    service.from("ai_settings").select("job_models").eq("id", 1).maybeSingle(),
  ]);
  const allowed = new Set(list.models.map((model) => model.id));
  const previous = normaliseJobModels(current.data?.job_models);
  const jobModels: Record<string, string[]> = {};
  let rejected = false;
  for (const { key } of MODEL_JOBS) {
    const picks: string[] = [];
    for (let index = 0; index < MAX_MODELS_PER_JOB; index += 1) {
      const value = form.get(`model_${key}_${index}`);
      if (typeof value !== "string" || !value || picks.includes(value)) continue;
      const known = allowed.has(value) || (previous[key] ?? []).includes(value);
      if (!known || !/^[A-Za-z0-9._~-]+\/[A-Za-z0-9._~/-]+:free$/.test(value) || value.length > 120) {
        rejected = true;
        continue;
      }
      picks.push(value);
    }
    if (picks.length) jobModels[key] = picks;
  }
  if (rejected) return await redirect(back("models-unknown"));
  const reason = typeof form.get("reason") === "string" ? String(form.get("reason")).trim().slice(0, 500) : "";
  const { error } = await admin.db.rpc("ai_models_save", { p_job_models: jobModels, p_reason: reason });
  revalidatePath(adminHref("/ai-scheduler"));
  return await redirect(back(error ? "models-failed" : "models-saved"));
}

const JOBS = Object.keys(AI_JOB_LABELS) as AiJob[];

export async function runAiJobNow(form: FormData): Promise<void> {
  const admin = await primaryAdmin();
  if (!admin) return await redirect(back("denied"));
  const job = form.get("job");
  if (typeof job !== "string" || !JOBS.includes(job as AiJob)) return await redirect(back("failed"));
  // Start the job in the background and open its live page straight away, so
  // the administrator can watch what it is doing instead of waiting minutes.
  let announce: (runId: string | null) => void = () => {};
  const started = new Promise<string | null>((resolve) => { announce = resolve; });
  const pass = runAutopilotPass({ trigger: "manual", job: job as AiJob, triggeredBy: admin.userId, onRunStarted: (runId) => announce(runId) })
    .then((result) => { announce(null); return result; })
    .catch((error: unknown) => {
      console.error("manual ai run failed", { message: error instanceof Error ? error.message : "unknown" });
      announce(null);
      return { ran: [], skipped: "The run stopped unexpectedly." } as Awaited<ReturnType<typeof runAutopilotPass>>;
    });
  after(() => pass.then(() => undefined));
  const runId = await started;
  if (runId) return await redirect(adminHref(`/ai-processes/runs/${runId}`));
  const result = await pass;
  const summary = result.skipped ?? (result.ran.map((entry) => `${AI_JOB_LABELS[entry.job]}: ${entry.summary}`).join(" ") || "Nothing to do.");
  return await redirect(`${adminHref("/ai-scheduler")}?result=ran&summary=${encodeURIComponent(summary.slice(0, 400))}`);
}

const processesBack = (result: string) => `${adminHref("/ai-processes")}?result=${encodeURIComponent(result)}`;

export async function resolveAiEscalation(form: FormData): Promise<void> {
  const admin = await primaryAdmin();
  if (!admin) return await redirect(processesBack("denied"));
  const id = Number(form.get("id"));
  const note = typeof form.get("note") === "string" ? String(form.get("note")).trim() : "";
  if (!Number.isSafeInteger(id) || id < 1 || note.length < 3) return await redirect(processesBack("note"));
  const { error } = await admin.db.rpc("ai_activity_resolve", { p_id: id, p_note: note.slice(0, 1000) });
  return await redirect(processesBack(error ? "failed" : "resolved"));
}

/** Human approval of an AI-drafted enquiry reply (approval mode). The email still says the AI assistant wrote it. */
export async function sendApprovedAiReply(form: FormData): Promise<void> {
  const admin = await primaryAdmin();
  if (!admin) return await redirect(processesBack("denied"));
  const id = Number(form.get("id"));
  if (!Number.isSafeInteger(id) || id < 1) return await redirect(processesBack("failed"));
  const { data: activity } = await admin.db.from("ai_activity").select("id,resource_id,details,resolved_at,action").eq("id", id).maybeSingle();
  const details = (activity?.details ?? {}) as { subject?: string; reply?: string };
  if (!activity || activity.action !== "enquiry.escalate" || activity.resolved_at || !activity.resource_id || typeof details.reply !== "string") return await redirect(processesBack("failed"));
  const service = formAdminClient();
  const { data: enquiry } = await service.from("private_enquiries").select("id,kind,sender_name,sender_email,message,created_at,status").eq("id", activity.resource_id).maybeSingle();
  if (!enquiry || enquiry.status !== "open") return await redirect(processesBack("failed"));
  const reply = typeof form.get("reply") === "string" && String(form.get("reply")).trim().length >= 20 ? String(form.get("reply")).trim() : details.reply;
  const problem = await sendAiEnquiryReply(service, enquiry as Enquiry, details.subject ?? "", reply, admin.userId);
  if (problem) return await redirect(processesBack("send-failed"));
  await admin.db.rpc("ai_activity_resolve", { p_id: id, p_note: "Approved and sent the AI-drafted reply." });
  return await redirect(processesBack("sent"));
}

export async function explainAdminLogsNow(): Promise<void> {
  const admin = await primaryAdmin();
  if (!admin) return await redirect(`${adminHref("/logs")}?result=denied`);
  const result = await runAutopilotPass({ trigger: "manual", job: "admin_logs", triggeredBy: admin.userId });
  const summary = result.skipped ?? result.ran.map((entry) => entry.summary).join(" ");
  return await redirect(`${adminHref("/logs")}?result=explained&summary=${encodeURIComponent(summary.slice(0, 300))}`);
}
