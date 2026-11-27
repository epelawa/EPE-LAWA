import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normaliseJobModels, type ModelJob } from "./settings";

/**
 * OpenRouter free models only. The live catalogue (`/api/v1/models`, every
 * price 0, id ending in ":free") is cached for six hours. Administrators pick,
 * per job, which models to use and in what order on the AI Scheduler page; a
 * call tries them in that order (no shuffling) and moves to the next one when a
 * model is busy, empty or slow. With nothing chosen, NVIDIA models are tried
 * first, then DeepSeek. Failed attempts count against the daily free quota, so
 * every attempt is recorded and the run stops at the configured budget. Paid
 * models are never sent, so the key can never be billed by this code.
 */

const API = "https://openrouter.ai/api/v1";
const CACHE_MS = 6 * 60 * 60 * 1000;

export type FreeModel = { id: string; name: string; context: number };
export type ChatMessage = { role: "system" | "user"; content: string };
export type ModelResult<T> = { ok: true; data: T; model: string; attempts: number } | { ok: false; error: string; attempts: number };

// Real OpenRouter keys look like "sk-or-v1-<hex>". Anything else (for example a
// test value left in Vercel until the owner pastes the real key) is treated as
// "no key", so the desk never sends doomed requests that eat the free allowance.
const OPENROUTER_KEY_PATTERN = /^sk-or-[A-Za-z0-9_-]{20,}$/;

export function openRouterKey(env: NodeJS.ProcessEnv = process.env): string | null {
  const key = env.OPENROUTER_API_KEY?.trim();
  return key && OPENROUTER_KEY_PATTERN.test(key) ? key : null;
}

/** True when OPENROUTER_API_KEY is set but is not a real OpenRouter key (a placeholder). */
export function openRouterKeyIsPlaceholder(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.OPENROUTER_API_KEY?.trim()) && openRouterKey(env) === null;
}

function headers(key: string): Record<string, string> {
  return {
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
    "http-referer": "https://epelawa.vercel.app",
    "x-title": "EPE LAWA AI Desk",
  };
}

/** Display and default order: NVIDIA first, then DeepSeek, then everything else by name. */
export function modelRank(id: string): number {
  if (id.startsWith("nvidia/")) return 0;
  if (id.startsWith("deepseek/")) return 1;
  return 2;
}

export function sortModels<T extends { id: string }>(models: readonly T[]): T[] {
  return [...models].sort((a, b) => modelRank(a.id) - modelRank(b.id) || a.id.localeCompare(b.id));
}

/** Default when an administrator has not chosen models for a job: NVIDIA, then DeepSeek (all free ones if neither exists). */
export function defaultModelIds(catalogue: readonly FreeModel[]): string[] {
  const preferred = sortModels(catalogue.filter((model) => modelRank(model.id) < 2)).map((model) => model.id);
  return preferred.length ? preferred : sortModels(catalogue).map((model) => model.id);
}

/**
 * The exact order a job tries models in: the administrator's choices that are
 * still free in the catalogue, else the default order. No randomness.
 */
export function modelQueue(catalogue: readonly FreeModel[], chosen: readonly string[] | undefined, maxAttempts: number): { queue: string[]; missing: string[]; usingDefault: boolean } {
  const available = new Set(catalogue.map((model) => model.id));
  const picks = (chosen ?? []).filter((id) => id.endsWith(":free"));
  const missing = picks.filter((id) => !available.has(id));
  const usable = picks.filter((id) => available.has(id));
  const usingDefault = usable.length === 0;
  const queue = (usingDefault ? defaultModelIds(catalogue) : usable).slice(0, Math.max(1, maxAttempts));
  return { queue, missing, usingDefault };
}

type CatalogueEntry = {
  id?: unknown;
  name?: unknown;
  context_length?: unknown;
  pricing?: { prompt?: unknown; completion?: unknown; request?: unknown };
  architecture?: { output_modalities?: unknown; input_modalities?: unknown };
};

export function freeModelsFromCatalogue(payload: unknown): FreeModel[] {
  const rows = (payload as { data?: unknown })?.data;
  if (!Array.isArray(rows)) return [];
  const free: FreeModel[] = [];
  for (const row of rows as CatalogueEntry[]) {
    if (typeof row.id !== "string" || !row.id.endsWith(":free")) continue;
    const prices = [row.pricing?.prompt, row.pricing?.completion, row.pricing?.request ?? "0"];
    if (!prices.every((price) => Number(price) === 0)) continue;
    const output = row.architecture?.output_modalities;
    if (Array.isArray(output) && !output.includes("text")) continue;
    const context = Number(row.context_length) || 0;
    if (context < 8000) continue;
    free.push({ id: row.id, name: typeof row.name === "string" ? row.name : row.id, context });
  }
  return free;
}

export async function freeModels(db: SupabaseClient, force = false): Promise<FreeModel[]> {
  const { data } = await db.from("ai_settings").select("model_cache,model_cache_at").eq("id", 1).maybeSingle();
  const cachedAt = data?.model_cache_at ? Date.parse(String(data.model_cache_at)) : 0;
  if (!force && Array.isArray(data?.model_cache) && data.model_cache.length && Date.now() - cachedAt < CACHE_MS) {
    return data.model_cache as FreeModel[];
  }
  try {
    const response = await fetch(`${API}/models`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return Array.isArray(data?.model_cache) ? (data.model_cache as FreeModel[]) : [];
    const models = freeModelsFromCatalogue(await response.json());
    if (models.length) await db.from("ai_settings").update({ model_cache: models, model_cache_at: new Date().toISOString() }).eq("id", 1);
    return models;
  } catch {
    return Array.isArray(data?.model_cache) ? (data.model_cache as FreeModel[]) : [];
  }
}

export type KeyStatus = {
  placeholder?: boolean;
  configured: boolean;
  reachable: boolean;
  label?: string;
  isFreeTier?: boolean;
  usage?: number;
  limitRemaining?: number | null;
  freeDailyUsed?: number;
  freeDailyLimit?: number;
  freeDailyRemaining?: number;
};

/** Account status for the admin page, including the free-model daily allowance when OpenRouter reports it. */
export async function keyStatus(env: NodeJS.ProcessEnv = process.env): Promise<KeyStatus> {
  const key = openRouterKey(env);
  if (!key) return { configured: false, reachable: false, placeholder: openRouterKeyIsPlaceholder(env) };
  try {
    const response = await fetch(`${API}/key`, { cache: "no-store", headers: headers(key), signal: AbortSignal.timeout(6000) });
    if (!response.ok) return { configured: true, reachable: false };
    const body = (await response.json()) as { data?: Record<string, unknown> };
    const data = body.data ?? {};
    const free = (data.free_model_daily_requests ?? data.free_tier_daily_requests) as Record<string, unknown> | undefined;
    const number = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);
    return {
      configured: true,
      reachable: true,
      label: typeof data.label === "string" ? data.label : undefined,
      isFreeTier: typeof data.is_free_tier === "boolean" ? data.is_free_tier : undefined,
      usage: number(data.usage),
      limitRemaining: data.limit_remaining === null ? null : number(data.limit_remaining),
      freeDailyUsed: number(free?.used ?? free?.requests_used),
      freeDailyLimit: number(free?.limit),
      freeDailyRemaining: number(free?.remaining),
    };
  } catch {
    return { configured: true, reachable: false };
  }
}

/** Requests this UTC day (OpenRouter resets the free allowance at 00:00 UTC). */
export async function requestsToday(db: SupabaseClient): Promise<number> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const { count } = await db.from("ai_model_calls").select("id", { count: "exact", head: true }).gte("created_at", start.toISOString());
  return count ?? 0;
}

/** Pulls the first JSON object out of a model reply (tolerates code fences and prose around it). */
export function parseJsonReply(text: string): unknown {
  const fenced = text.replace(/```(?:json)?/gi, "").trim();
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no_json");
  return JSON.parse(fenced.slice(start, end + 1));
}

export type Budget = { remaining: number };

/** Pulls the reply text; "thinking" models sometimes leave content empty and put the answer in `reasoning`. */
export function replyText(message: { content?: unknown; reasoning?: unknown } | undefined): { text: string; fromReasoning: boolean } {
  const content = typeof message?.content === "string" ? message.content.trim() : "";
  if (content) return { text: content, fromReasoning: false };
  const reasoning = typeof message?.reasoning === "string" ? message.reasoning : "";
  return reasoning.includes("{") ? { text: reasoning, fromReasoning: true } : { text: "", fromReasoning: false };
}

export async function chatJson<T>(
  db: SupabaseClient,
  options: {
    job: ModelJob;
    runId: string | null;
    messages: ChatMessage[];
    validate: (value: unknown) => T | null;
    budget: Budget;
    deadline: number;
    maxAttempts?: number;
    maxTokens?: number;
    temperature?: number;
    /** Per-model time limit; long news rewrites need more than short replies. */
    timeoutMs?: number;
  },
): Promise<ModelResult<T>> {
  const key = openRouterKey();
  if (!key) return { ok: false, error: "OPENROUTER_API_KEY is not set in Vercel.", attempts: 0 };
  const [catalogue, settingsRow] = await Promise.all([
    freeModels(db),
    db.from("ai_settings").select("job_models").eq("id", 1).maybeSingle(),
  ]);
  const chosen = normaliseJobModels(settingsRow.data?.job_models)[options.job];
  const { queue, missing } = modelQueue(catalogue, chosen, options.maxAttempts ?? 4);
  const errors: string[] = [];
  if (missing.length) errors.push(`chosen model${missing.length > 1 ? "s" : ""} no longer free on OpenRouter, skipped: ${missing.join(", ")}`);
  if (!queue.length) return { ok: false, error: [...errors, "no free model available"].join("; "), attempts: 0 };
  let attempts = 0;
  for (const model of queue) {
    if (options.budget.remaining <= 0) {
      errors.push("daily request budget reached");
      break;
    }
    const left = options.deadline - Date.now();
    if (left < 15_000) {
      errors.push("run time limit reached");
      break;
    }
    attempts += 1;
    options.budget.remaining -= 1;
    const started = Date.now();
    let status: number | null = null;
    let failure: string | null = null;
    try {
      const response = await fetch(`${API}/chat/completions`, {
        method: "POST",
        cache: "no-store",
        headers: headers(key),
        signal: AbortSignal.timeout(Math.min(options.timeoutMs ?? 45_000, left - 5000)),
        body: JSON.stringify({
          model,
          messages: options.messages,
          temperature: options.temperature ?? 0.3,
          max_tokens: options.maxTokens ?? 3000,
          // Keep "thinking" short so the answer itself fits in the token allowance.
          reasoning: { effort: "low" },
        }),
      });
      status = response.status;
      const body = (await response.json().catch(() => null)) as { choices?: { finish_reason?: unknown; message?: { content?: unknown; reasoning?: unknown } }[]; error?: { message?: unknown }; model?: unknown } | null;
      if (!response.ok) {
        const detail = typeof body?.error?.message === "string" ? `: ${body.error.message}` : "";
        failure = response.status === 429 ? `busy (HTTP 429${detail}) — moved to the next model` : `HTTP ${response.status}${detail}`;
      } else {
        const choice = body?.choices?.[0];
        const { text } = replyText(choice?.message);
        if (!text) failure = choice?.finish_reason === "length" ? "ran out of tokens while thinking (empty reply)" : "empty reply";
        else {
          try {
            const value = options.validate(parseJsonReply(text));
            if (!value) failure = "reply did not match the required format";
            else {
              const used = typeof body?.model === "string" ? body.model : model;
              await recordCall(db, options, used, true, status, Date.now() - started, null);
              return { ok: true, data: value, model: used, attempts };
            }
          } catch {
            failure = "reply was not valid JSON";
          }
        }
      }
    } catch (error) {
      failure = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError") ? "too slow (timed out)" : "network error";
    }
    await recordCall(db, options, model, false, status, Date.now() - started, failure);
    errors.push(`${model}: ${failure}`);
  }
  return { ok: false, error: errors.join("; ").slice(0, 900) || "no free model available", attempts };
}

async function recordCall(db: SupabaseClient, options: { job: string; runId: string | null }, model: string, ok: boolean, status: number | null, latency: number, error: string | null) {
  await db.from("ai_model_calls").insert({
    run_id: options.runId,
    job: options.job,
    model: model.slice(0, 120),
    ok,
    http_status: status,
    latency_ms: latency,
    error: error?.slice(0, 500) ?? null,
  });
}
