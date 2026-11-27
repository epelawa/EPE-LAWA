import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formAdminClient } from "../form-server";
import { finishRun, RunLog, startRun, type AiJob } from "./activity";
import { ensureAiActor } from "./actor";
import { keyStatus, openRouterKey, requestsToday, type Budget } from "./openrouter";
import { loadAiSettings, type AiSettings } from "./settings";
import { runNewsJob } from "./jobs/news";
import { runEnquiryJob } from "./jobs/enquiries";
import { runBusinessJob } from "./jobs/businesses";
import { runAdsJob } from "./jobs/ads";
import { runModerationJob } from "./jobs/moderation";
import { runAdminLogJob } from "./jobs/admin-logs";

/**
 * One autopilot pass. Scheduled passes (every 5 minutes from pg_cron, only
 * while autopilot is on) run whatever is due; a manual "Run now" runs one job
 * even when autopilot is off, in which case the AI only drafts and recommends
 * (approval mode) and every outcome is escalated for a human.
 */

export const AI_JOB_LABELS: Record<AiJob, string> = {
  news: "News desk",
  moderation: "Comment moderation",
  enquiries: "Enquiry replies",
  businesses: "Business verification",
  admin_logs: "Admin log explanations",
  ads: "Ad placement",
};

const CAPABILITY: Record<AiJob, keyof AiSettings["capabilities"]> = {
  news: "news",
  moderation: "comment_moderation",
  enquiries: "enquiry_reply",
  businesses: "business_review",
  admin_logs: "admin_log_explain",
  ads: "ads",
};

// Vercel Fluid compute allows 300 s per invocation on this project. Scheduled
// passes use 280 s; "Run now" from the admin page uses 240 s so the page answers in time.
const RUN_SECONDS = { schedule: 280, manual: 240 } as const;

function olderThan(value: string | null, minutes: number): boolean {
  return !value || Date.now() - Date.parse(value) >= minutes * 60_000;
}

async function lastRunStart(db: SupabaseClient, job: AiJob): Promise<string | null> {
  const { data } = await db.from("ai_runs").select("started_at").eq("job", job).in("status", ["success", "partial", "skipped"]).order("started_at", { ascending: false }).limit(1).maybeSingle();
  return data?.started_at ? String(data.started_at) : null;
}

export type PassResult = { ran: { job: AiJob; summary: string }[]; skipped: string | null };

export async function runAutopilotPass(options: { trigger: "schedule" | "manual"; job?: AiJob; triggeredBy?: string | null; onRunStarted?: (runId: string) => void }): Promise<PassResult> {
  const started = Date.now();
  const deadline = started + RUN_SECONDS[options.trigger] * 1000;
  const db = formAdminClient();
  const settings = await loadAiSettings(db);
  if (!settings) return { ran: [], skipped: "AI settings are missing (database migration not applied)." };
  if (options.trigger === "schedule" && !settings.autopilot_enabled) return { ran: [], skipped: "Autopilot is off." };
  if (!openRouterKey()) return { ran: [], skipped: "OPENROUTER_API_KEY is not set in Vercel." };

  // Never overlap passes: a pass still running (or crashed) in the last 6 minutes blocks scheduled starts.
  if (options.trigger === "schedule") {
    const { count } = await db.from("ai_runs").select("id", { count: "exact", head: true }).eq("status", "running").gte("started_at", new Date(started - 6 * 60_000).toISOString());
    if ((count ?? 0) > 0) return { ran: [], skipped: "Another pass is still running." };
  }
  await db.from("ai_runs").update({ status: "failed", finished_at: new Date().toISOString(), summary: "Stopped before finishing (time limit)." }).eq("status", "running").lt("started_at", new Date(started - 10 * 60_000).toISOString());

  let actorId: string;
  try {
    actorId = await ensureAiActor(db);
  } catch (error) {
    return { ran: [], skipped: `The AI staff identity could not be prepared: ${error instanceof Error ? error.message : "unknown"}` };
  }

  const used = await requestsToday(db);
  const key = await keyStatus();
  let remaining = settings.daily_request_budget - used;
  if (typeof key.freeDailyRemaining === "number") remaining = Math.min(remaining, key.freeDailyRemaining);
  const budget: Budget = { remaining: Math.max(0, remaining) };
  const publish = settings.autopilot_enabled;

  const due: AiJob[] = [];
  if (options.job) due.push(options.job);
  else {
    if (settings.capabilities.news && olderThan(settings.last_news_run_at, settings.news_interval_minutes - 2)) due.push("news");
    if (settings.capabilities.comment_moderation) due.push("moderation");
    if (settings.capabilities.enquiry_reply) due.push("enquiries");
    if (settings.capabilities.business_review) due.push("businesses");
    if (settings.capabilities.admin_log_explain && olderThan(settings.last_explain_run_at, 58)) due.push("admin_logs");
    if (settings.capabilities.ads && olderThan(settings.last_ads_run_at, 23 * 60)) due.push("ads");
  }

  const ran: PassResult["ran"] = [];
  for (const job of due) {
    if (Date.now() > deadline - 30_000) break;
    if (!settings.capabilities[CAPABILITY[job]] && options.trigger === "schedule") continue;
    const needsModel = job !== "ads";
    if (needsModel && budget.remaining <= 0) {
      if (options.job) ran.push({ job, summary: "Daily free-model request budget used up; try again after 01:00 WAT." });
      continue;
    }
    // Cheap pre-checks so idle jobs never create empty runs or spend requests.
    if (!options.job && job === "moderation") {
      const since = (await lastRunStart(db, "moderation")) ?? new Date(started - 24 * 3600_000).toISOString();
      const { count } = await db.from("comments").select("id", { count: "exact", head: true }).eq("state", "visible").gt("created_at", since);
      if (!count) continue;
    }
    if (!options.job && job === "enquiries") {
      const { count } = await db.from("private_enquiries").select("id", { count: "exact", head: true }).eq("status", "open");
      if (!count) continue;
      const { count: open } = await db.from("ai_activity").select("id", { count: "exact", head: true }).eq("action", "enquiry.escalate").eq("outcome", "escalated").is("resolved_at", null);
      if ((open ?? 0) >= count) continue;
    }
    if (!options.job && job === "businesses") {
      const { count } = await db.from("businesses").select("id", { count: "exact", head: true }).in("status", ["submitted", "reviewing"]).is("deleted_at", null);
      if (!count) continue;
      const { count: open } = await db.from("ai_activity").select("id", { count: "exact", head: true }).eq("action", "business.escalate").eq("outcome", "escalated").is("resolved_at", null);
      if ((open ?? 0) >= count) continue;
    }

    const runId = await startRun(db, job, options.trigger, options.triggeredBy ?? null);
    const log = new RunLog(db, runId, actorId);
    if (runId) options.onRunStarted?.(runId);
    await log.step(`Started ${AI_JOB_LABELS[job]} (${options.trigger === "manual" ? "Run now" : "scheduled"}${publish ? "" : ", approval mode — results go to a human"}). ${budget.remaining} free model requests left today.`);
    let summary = "";
    try {
      if (job === "news") {
        summary = await runNewsJob(db, { settings, log, budget, deadline, publish });
        await db.from("ai_settings").update({ last_news_run_at: new Date(started).toISOString() }).eq("id", 1);
      } else if (job === "moderation") {
        const since = (await lastRunStart(db, "moderation")) ?? new Date(started - 24 * 3600_000).toISOString();
        summary = await runModerationJob(db, { log, budget, deadline, publish, since });
      } else if (job === "enquiries") {
        summary = await runEnquiryJob(db, { log, budget, deadline, publish });
      } else if (job === "businesses") {
        summary = await runBusinessJob(db, { log, budget, deadline, publish });
      } else if (job === "admin_logs") {
        // Scheduled: the last full hour. Manual "Explain now": the last six hours up to now.
        const end = new Date(started);
        if (options.trigger === "schedule") end.setUTCMinutes(0, 0, 0);
        const start = new Date(end.getTime() - (options.trigger === "schedule" ? 1 : 6) * 3600_000);
        summary = await runAdminLogJob(db, { log, budget, deadline, periodStart: start, periodEnd: end });
        await db.from("ai_settings").update({ last_explain_run_at: new Date(started).toISOString() }).eq("id", 1);
      } else if (job === "ads") {
        summary = await runAdsJob(db, { log, actorId, publish });
        await db.from("ai_settings").update({ last_ads_run_at: new Date(started).toISOString() }).eq("id", 1);
      }
    } catch (error) {
      console.error("ai job crashed", { job, message: error instanceof Error ? error.message : "unknown" });
      await log.record({ job, action: `${job}.run`, outcome: "failed", title: `${AI_JOB_LABELS[job]} stopped unexpectedly`, reason: error instanceof Error ? error.message.slice(0, 500) : "unknown error" });
      summary = "Stopped unexpectedly.";
    }
    await finishRun(db, runId, log, summary, { requests_left: budget.remaining, mode: publish ? "autopilot" : "approval" });
    ran.push({ job, summary });
  }
  return { ran, skipped: null };
}
