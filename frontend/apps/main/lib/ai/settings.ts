import type { SupabaseClient } from "@supabase/supabase-js";
import { isAllowedModelId } from "./providers";
import { cleanNewsTimes } from "./news-schedule";
import { normaliseJobSchedules, normaliseLastDue, type JobSchedule, type ScheduledJob } from "./job-schedule";

export const AI_CAPABILITIES = [
  { key: "news", label: "Write Epe Division news drafts on the schedule below", hint: "Epe Division only (Epe, Ibeju-Lekki and their LCDAs), in original words. The AI only saves drafts; an editor checks and publishes every story." },
  // Retired (owner, turn 26): no categories, and the AI never publishes, so it
  // never pushes or flags breaking news. Kept hidden so old settings still load.
  { key: "categories", label: "Create new news categories", hint: "Retired.", hidden: true },
  { key: "push", label: "Send push notifications", hint: "Retired: the AI never publishes.", hidden: true },
  { key: "breaking", label: "Flag breaking news", hint: "Retired: the AI never publishes.", hidden: true },
  { key: "business_review", label: "Verify submitted businesses", hint: "Checks the website and OpenStreetMap; publishes only with evidence." },
  { key: "enquiry_reply", label: "Reply to contact enquiries by email", hint: "Every email says it was written by the AI assistant and greets the person by name. Corrections always go to a human." },
  { key: "support_reply", label: "Answer support tickets", hint: "Sorts each new ticket (topic and priority), answers what it safely can by email, and hands the rest to staff." },
  { key: "ads", label: "Place approved ads", hint: "Only businesses with a verified paid sponsorship; rotates their order daily." },
  { key: "comment_moderation", label: "Hide abusive or spam comments", hint: "Hides with a stated reason; staff can restore." },
  { key: "admin_log_explain", label: "Explain admin activity in the Logs", hint: "Writes an hourly plain-English summary of what each admin did." },
] as const;

export type AiCapability = (typeof AI_CAPABILITIES)[number]["key"];

/** Jobs that call a model (ads are rule-based). Each can have its own ordered model list. */
export const MODEL_JOBS = [
  { key: "news", label: "News writing", hint: "Long, careful rewrites of source reports — pick strong models." },
  { key: "enquiries", label: "Enquiry replies", hint: "Short emails; fast models work well." },
  { key: "support", label: "Support tickets", hint: "Sorts and answers support tickets; fast models work well." },
  { key: "businesses", label: "Business verification", hint: "Weighs evidence about submitted businesses." },
  { key: "moderation", label: "Comment moderation", hint: "Quick spam/abuse checks; fast models work well." },
  { key: "admin_logs", label: "Admin log explanations", hint: "Plain-English hourly summaries." },
  { key: "chat", label: "Admin AI chat", hint: "Understands your instructions about articles and support tickets — pick models that follow instructions well." },
  { key: "directions", label: "Map assistant (Epe directions)", hint: "Answers visitors' questions on the map page; fast models work well." },
] as const;
export type ModelJob = (typeof MODEL_JOBS)[number]["key"];
export const MAX_MODELS_PER_JOB = 5;

export function normaliseJobModels(raw: unknown): Partial<Record<ModelJob, string[]>> {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const result: Partial<Record<ModelJob, string[]>> = {};
  for (const { key } of MODEL_JOBS) {
    const list = Array.isArray(source[key]) ? (source[key] as unknown[]).filter((id): id is string => typeof id === "string" && isAllowedModelId(id)) : [];
    if (list.length) result[key] = [...new Set(list)].slice(0, MAX_MODELS_PER_JOB);
  }
  return result;
}

export type AiSettings = {
  autopilot_enabled: boolean;
  schedule_enabled: boolean;
  daily_start: string | null;
  daily_stop: string | null;
  auto_on_at: string | null;
  auto_off_at: string | null;
  news_interval_minutes: number;
  articles_per_run: number;
  daily_request_budget: number;
  push_daily_limit: number;
  /** Hours an AI-flagged breaking story stays in the ticker (1–72). */
  breaking_hours: number;
  /** Most stories the AI keeps breaking at once (1–10). */
  breaking_max: number;
  /** Exact Lagos times (HH:MM) for news runs; empty means every news_interval_minutes. */
  news_times: string[];
  /** Stories still owed from a run that hit its time limit. */
  news_owed: number;
  capabilities: Record<AiCapability, boolean>;
  /** When each non-news job runs on autopilot. */
  job_schedules: Record<ScheduledJob, JobSchedule>;
  /** When each scheduled job was last checked. */
  job_last_due: Partial<Record<ScheduledJob, string>>;
  job_models: Partial<Record<ModelJob, string[]>>;
  actor_user_id: string | null;
  last_news_run_at: string | null;
  last_ads_run_at: string | null;
  last_explain_run_at: string | null;
  updated_at: string | null;
};

export const AI_SETTINGS_COLUMNS = "autopilot_enabled,schedule_enabled,daily_start,daily_stop,auto_on_at,auto_off_at,news_interval_minutes,articles_per_run,daily_request_budget,push_daily_limit,breaking_hours,breaking_max,news_times,news_owed,capabilities,job_schedules,job_last_due,job_models,actor_user_id,last_news_run_at,last_ads_run_at,last_explain_run_at,updated_at";

export function normaliseSettings(row: Record<string, unknown> | null): AiSettings | null {
  if (!row) return null;
  const raw = (row.capabilities && typeof row.capabilities === "object" ? row.capabilities : {}) as Record<string, unknown>;
  const capabilities = Object.fromEntries(AI_CAPABILITIES.map(({ key }) => [key, raw[key] === true])) as Record<AiCapability, boolean>;
  const newsTimes = Array.isArray(row.news_times) ? cleanNewsTimes(row.news_times) : [];
  const owed = Number(row.news_owed);
  const hours = Number(row.breaking_hours);
  const most = Number(row.breaking_max);
  return { ...(row as unknown as AiSettings), capabilities,
    breaking_hours: Number.isInteger(hours) && hours >= 1 && hours <= 72 ? hours : 6,
    breaking_max: Number.isInteger(most) && most >= 1 && most <= 10 ? most : 5, job_models: normaliseJobModels(row.job_models), job_schedules: normaliseJobSchedules(row.job_schedules), job_last_due: normaliseLastDue(row.job_last_due), news_times: newsTimes, news_owed: Number.isInteger(owed) && owed > 0 ? owed : 0 };
}

export async function loadAiSettings(db: SupabaseClient): Promise<AiSettings | null> {
  const { data, error } = await db.from("ai_settings").select(AI_SETTINGS_COLUMNS).eq("id", 1).maybeSingle();
  if (error) return null;
  return normaliseSettings(data as Record<string, unknown> | null);
}
