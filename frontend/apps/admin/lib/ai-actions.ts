"use server";

import { cookies } from "next/headers";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { adminRedirect as redirect } from "./admin-redirect";
import { adminHref } from "./admin-path";
import { createStaffClient } from "./supabase";
import { readAdminSessionFromCookies } from "./supabase-access";
import { AI_CAPABILITIES, MAX_MODELS_PER_JOB, MODEL_JOBS, normaliseJobModels } from "../../main/lib/ai/settings";
import { normaliseJobSchedules } from "../../main/lib/ai/job-schedule";
import { cleanNewsTimes, NEWS_LIMITS } from "../../main/lib/ai/news-schedule";
import { JOB_INTERVAL_LIMITS, SCHEDULED_JOBS, type JobSchedule } from "../../main/lib/ai/job-schedule";
import { loadFreeModels } from "../../main/lib/ai/openrouter";
import { isAllowedModelId, plausibleKey, providerById, type ProviderId } from "../../main/lib/ai/providers";
import { removeKey, storeKey, vaultReady } from "../../main/lib/ai/key-vault";
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
  const capabilities: Record<string, boolean> = Object.fromEntries(AI_CAPABILITIES.map((capability) => [capability.key, !("hidden" in capability) && form.get(`cap_${capability.key}`) === "on"]));
  const reason = typeof form.get("reason") === "string" ? String(form.get("reason")).trim().slice(0, 500) : "";
  const interval = chosen(form, "news_interval_minutes", NEWS_LIMITS.interval, 60);
  const perRun = chosen(form, "articles_per_run", NEWS_LIMITS.articles, 1);
  // No local request cap any more: the AI runs while OpenRouter accepts requests.
  const budget = NEWS_LIMITS.budget.max;
  const pushes = chosen(form, "push_daily_limit", NEWS_LIMITS.push, 3);
  const breakingHours = chosen(form, "breaking_hours", NEWS_LIMITS.breakingHours, 6);
  const breakingMax = chosen(form, "breaking_max", NEWS_LIMITS.breakingMax, 5);
  if (interval === null || perRun === null || pushes === null || breakingHours === null || breakingMax === null) return await redirect(back("custom"));
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
  const breaking = error ? null : await admin.db.rpc("ai_breaking_save", { p_hours: breakingHours, p_max: breakingMax, p_enabled: form.get("cap_breaking") === "on" });
  revalidatePath(adminHref("/ai-scheduler"));
  return await redirect(back(error || schedule?.error || breaking?.error ? "failed" : "saved"));
}

/** Reads one job's schedule from the form; null when a custom interval is out of range or set times are missing. */
function readJobSchedule(form: FormData, job: string, fallbackMinutes: number): JobSchedule | null {
  const raw = String(form.get(`sched_${job}_mode`) ?? "pass");
  const mode: JobSchedule["mode"] = raw === "interval" || raw === "times" || raw === "off" ? raw : "pass";
  const minutes = mode === "interval" ? chosen(form, `sched_${job}_minutes`, JOB_INTERVAL_LIMITS, fallbackMinutes) : bounded(form.get(`sched_${job}_minutes`), JOB_INTERVAL_LIMITS.min, JOB_INTERVAL_LIMITS.max, fallbackMinutes);
  if (minutes === null) return null;
  const times = mode === "times" ? cleanNewsTimes(form.getAll(`sched_${job}_time`)) : [];
  if (mode === "times" && !times.length) return null;
  // The database always wants minutes (5 to 10080), whatever the mode.
  return { mode, minutes, times };
}

/** When each non-news AI job runs on autopilot (Comment moderation, Enquiry replies, Support, Businesses, Admin logs, Ads). */
export async function saveAiJobSchedules(form: FormData): Promise<void> {
  const admin = await primaryAdmin();
  if (!admin) return await redirect(back("denied"));
  const current = await admin.db.from("ai_settings").select("capabilities,job_schedules").eq("id", 1).maybeSingle();
  if (current.error) return await redirect(back("schedules-failed"));
  const previous = normaliseJobSchedules(current.data?.job_schedules);
  const schedules: Record<string, JobSchedule> = {};
  for (const { key } of SCHEDULED_JOBS) {
    const schedule = readJobSchedule(form, key, previous[key].minutes);
    if (!schedule) return await redirect(back("schedules-invalid"));
    schedules[key] = schedule;
  }
  const capabilities = (current.data?.capabilities ?? {}) as Record<string, unknown>;
  const { error } = await admin.db.rpc("ai_job_schedules_save", { p_schedules: schedules, p_support_enabled: capabilities.support_reply === true });
  revalidatePath(adminHref("/ai-scheduler"));
  return await redirect(back(error ? "schedules-failed" : "schedules-saved"));
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
      if (!known || !isAllowedModelId(value)) {
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
  const newsMode = job === "news" && form.get("mode") === "reedit" ? "reedit" : "write";
  const pass = runAutopilotPass({ trigger: "manual", job: job as AiJob, newsMode, triggeredBy: admin.userId, onRunStarted: (runId) => announce(runId) })
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

/**
 * AI provider keys typed on the AI Scheduler page. The key travels once, over
 * HTTPS, inside this server action; it is checked against the provider, then
 * sealed with AES-256-GCM (AI_KEYS_SECRET, a server-only Vercel secret) and
 * stored where only the server can read it. It is never sent back to a
 * browser, logged or put in the audit — only "saved" and the time.
 */
export async function saveProviderKey(form: FormData): Promise<void> {
  const admin = await primaryAdmin();
  if (!admin) return await redirect(back("denied"));
  const provider = providerById(String(form.get("provider") ?? ""));
  const key = String(form.get("api_key") ?? "").trim();
  if (!provider) return await redirect(back("key-invalid"));
  if (!vaultReady()) return await redirect(back("key-vault"));
  if (!plausibleKey(provider.id, key)) return await redirect(back("key-invalid"));
  // Prove the key works before saving it (a model list needs a valid key on every provider but OpenRouter).
  const check = await testProviderKey(provider.id, key);
  if (check === "rejected") return await redirect(back("key-rejected"));
  const error = await storeKey(formAdminClient(), provider.id, key, admin.userId);
  if (error) return await redirect(back("key-failed"));
  await formAdminClient().from("ai_activity").insert({ job: "schedule", action: "settings.provider_key", outcome: "done", title: `${provider.label} key saved (encrypted)`, details: { provider: provider.id, verified: check === "ok" }, actor_id: admin.userId });
  revalidatePath(adminHref("/ai-scheduler"));
  return await redirect(back(check === "unverified" ? "key-saved-unverified" : "key-saved"));
}

export async function removeProviderKey(form: FormData): Promise<void> {
  const admin = await primaryAdmin();
  if (!admin) return await redirect(back("denied"));
  const provider = providerById(String(form.get("provider") ?? ""));
  if (!provider) return await redirect(back("key-invalid"));
  const error = await removeKey(formAdminClient(), provider.id);
  if (!error) await formAdminClient().from("ai_activity").insert({ job: "schedule", action: "settings.provider_key", outcome: "done", title: `${provider.label} key removed`, details: { provider: provider.id }, actor_id: admin.userId });
  revalidatePath(adminHref("/ai-scheduler"));
  return await redirect(back(error ? "key-failed" : "key-removed"));
}

/** "ok" when the provider accepted the key, "rejected" on 401/403, "unverified" when it could not be reached. */
async function testProviderKey(provider: ProviderId, key: string): Promise<"ok" | "rejected" | "unverified"> {
  const entry = providerById(provider)!;
  const url = provider === "openrouter" ? `${entry.base}/key` : `${entry.base}/models`;
  try {
    const response = await fetch(url, { cache: "no-store", headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000) });
    if (response.status === 401 || response.status === 403) return "rejected";
    return response.ok ? "ok" : "unverified";
  } catch {
    return "unverified";
  }
}
