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
  actor_user_id: string | null;
  last_news_run_at: string | null;
  last_ads_run_at: string | null;
  last_explain_run_at: string | null;
  updated_at: string | null;
};

export const AI_SETTINGS_COLUMNS = "autopilot_enabled,schedule_enabled,daily_start,daily_stop,auto_on_at,auto_off_at,news_interval_minutes,articles_per_run,daily_request_budget,push_daily_limit,capabilities,actor_user_id,last_news_run_at,last_ads_run_at,last_explain_run_at,updated_at";

export function normaliseSettings(row: Record<string, unknown> | null): AiSettings | null {
  if (!row) return null;
  const raw = (row.capabilities && typeof row.capabilities === "object" ? row.capabilities : {}) as Record<string, unknown>;
  const capabilities = Object.fromEntries(AI_CAPABILITIES.map(({ key }) => [key, raw[key] === true])) as Record<AiCapability, boolean>;
  return { ...(row as unknown as AiSettings), capabilities };
}

export async function loadAiSettings(db: SupabaseClient): Promise<AiSettings | null> {
  const { data, error } = await db.from("ai_settings").select(AI_SETTINGS_COLUMNS).eq("id", 1).maybeSingle();
  if (error) return null;
  return normaliseSettings(data as Record<string, unknown> | null);
}
