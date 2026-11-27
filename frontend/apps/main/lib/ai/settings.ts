import type { SupabaseClient } from "@supabase/supabase-js";

export const AI_CAPABILITIES = [
  { key: "news", label: "Write and publish news every hour", hint: "Epe first, then Lagos, Nigeria and the world, from trusted outlets only." },
  { key: "categories", label: "Create new news categories", hint: "Only when no existing category fits a story." },
  { key: "push", label: "Send push notifications", hint: "Major breaking stories only, within the daily limit below." },
  { key: "business_review", label: "Verify submitted businesses", hint: "Checks the website and OpenStreetMap; publishes only with evidence." },
  { key: "enquiry_reply", label: "Reply to contact enquiries by email", hint: "Every email says it was written by the AI assistant. Corrections always go to a human." },
  { key: "ads", label: "Place approved ads", hint: "Only businesses with a verified paid sponsorship; rotates their order daily." },
  { key: "comment_moderation", label: "Hide abusive or spam comments", hint: "Hides with a stated reason; staff can restore." },
  { key: "admin_log_explain", label: "Explain admin activity in the Logs", hint: "Writes an hourly plain-English summary of what each admin did." },
] as const;

export type AiCapability = (typeof AI_CAPABILITIES)[number]["key"];

/** Jobs that call a model (ads are rule-based). Each can have its own ordered model list. */
export const MODEL_JOBS = [
  { key: "news", label: "News writing", hint: "Long, careful rewrites of source reports — pick strong models." },
  { key: "enquiries", label: "Enquiry replies", hint: "Short emails; fast models work well." },
  { key: "businesses", label: "Business verification", hint: "Weighs evidence about submitted businesses." },
  { key: "moderation", label: "Comment moderation", hint: "Quick spam/abuse checks; fast models work well." },
  { key: "admin_logs", label: "Admin log explanations", hint: "Plain-English hourly summaries." },
] as const;
export type ModelJob = (typeof MODEL_JOBS)[number]["key"];
export const MAX_MODELS_PER_JOB = 5;

export function normaliseJobModels(raw: unknown): Partial<Record<ModelJob, string[]>> {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const result: Partial<Record<ModelJob, string[]>> = {};
  for (const { key } of MODEL_JOBS) {
    const list = Array.isArray(source[key]) ? (source[key] as unknown[]).filter((id): id is string => typeof id === "string" && id.endsWith(":free")) : [];
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
  capabilities: Record<AiCapability, boolean>;
  job_models: Partial<Record<ModelJob, string[]>>;
  actor_user_id: string | null;
  last_news_run_at: string | null;
  last_ads_run_at: string | null;
  last_explain_run_at: string | null;
  updated_at: string | null;
};

export const AI_SETTINGS_COLUMNS = "autopilot_enabled,schedule_enabled,daily_start,daily_stop,auto_on_at,auto_off_at,news_interval_minutes,articles_per_run,daily_request_budget,push_daily_limit,capabilities,job_models,actor_user_id,last_news_run_at,last_ads_run_at,last_explain_run_at,updated_at";

export function normaliseSettings(row: Record<string, unknown> | null): AiSettings | null {
  if (!row) return null;
  const raw = (row.capabilities && typeof row.capabilities === "object" ? row.capabilities : {}) as Record<string, unknown>;
  const capabilities = Object.fromEntries(AI_CAPABILITIES.map(({ key }) => [key, raw[key] === true])) as Record<AiCapability, boolean>;
  return { ...(row as unknown as AiSettings), capabilities, job_models: normaliseJobModels(row.job_models) };
}

export async function loadAiSettings(db: SupabaseClient): Promise<AiSettings | null> {
  const { data, error } = await db.from("ai_settings").select(AI_SETTINGS_COLUMNS).eq("id", 1).maybeSingle();
  if (error) return null;
  return normaliseSettings(data as Record<string, unknown> | null);
}
