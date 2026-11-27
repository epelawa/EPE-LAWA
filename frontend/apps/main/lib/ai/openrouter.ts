import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normaliseJobModels, type ModelJob } from "./settings";
import { runStep } from "./activity";

/**
 * OpenRouter free models only. The list of models is loaded live from
 * OpenRouter (`GET /api/v1/models`) every time it is needed. Nothing is
 * hardcoded: a model is offered when OpenRouter lists it as a ":free" variant
 * with every price 0 that can write text through chat completions.
 * Administrators pick, per job, which models to use and in what order on the
 * AI Scheduler page; a call tries them in that order (no shuffling) and moves to
 * the next one when a model is busy, empty or slow. A copy of the last good list
 * is kept only so the page still works if OpenRouter is briefly unreachable.
 * Failed attempts count against the daily free quota, so every attempt is
 * recorded; there is no local budget — the run stops only when OpenRouter refuses. Paid models are never
 * sent, so the key can never be billed by this code.
 */

const API = "https://openrouter.ai/api/v1";
// Within one server instance the live list is reused for one minute, so a pass
// that calls several jobs does not download the 600-model catalogue each time.
const LIVE_REUSE_MS = 60_000;

export type FreeModel = {
  id: string;
  name: string;
  context: number;
  /** The part of the id before "/", as OpenRouter publishes it (e.g. "baidu"). */
  provider?: string;
  description?: string;
  /** OpenRouter's "going away" date, when it announces one. */
  expires?: string | null;
  /** Unix seconds when OpenRouter added the model. */
  created?: number;
  /** OpenRouter says the model supports response_format / structured outputs (reliable JSON). */
  json?: boolean;
  /** OpenRouter says the model thinks before it answers. */
  reasoning?: boolean;
  maxOutput?: number | null;
};
export type ModelList = { models: FreeModel[]; source: "live" | "saved" | "none"; loadedAt: string | null; error?: string };
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

/**
 * Used only for a job that has no models chosen yet: OpenRouter's own data, no
 * vendor preference. Models OpenRouter marks as supporting structured (JSON)
 * output come first, then larger context windows; ties keep OpenRouter's order.
 */
export function defaultModelIds(catalogue: readonly FreeModel[]): string[] {
  return catalogue
    .map((model, index) => ({ model, index }))
    .sort((a, b) => Number(Boolean(b.model.json)) - Number(Boolean(a.model.json)) || b.model.context - a.model.context || a.index - b.index)
    .map(({ model }) => model.id);
}

/**
 * The exact order a job tries models in: the administrator's choices that are
 * still free in OpenRouter's live list, else defaultModelIds. No randomness.
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
  description?: unknown;
  created?: unknown;
  context_length?: unknown;
  expiration_date?: unknown;
  pricing?: Record<string, unknown>;
  architecture?: { output_modalities?: unknown; input_modalities?: unknown };
  supported_parameters?: unknown;
  endpoints?: unknown;
  top_provider?: { max_completion_tokens?: unknown };
  reasoning?: unknown;
};

/** OpenRouter's catalogue → the free chat models in it, in OpenRouter's order. */
export function freeModelsFromCatalogue(payload: unknown): FreeModel[] {
  const rows = (payload as { data?: unknown })?.data;
  if (!Array.isArray(rows)) return [];
  const free: FreeModel[] = [];
  const seen = new Set<string>();
  for (const row of rows as CatalogueEntry[]) {
    if (typeof row.id !== "string" || !row.id.endsWith(":free") || seen.has(row.id)) continue;
    // Every listed price must be zero (prompt, completion, per-request, cache, images…).
    // Web search is the one exception: it is only billed when a request asks for
    // it, and this code never does.
    const pricing = row.pricing ?? {};
    if (!("prompt" in pricing) || !("completion" in pricing)) continue;
    if (!Object.entries(pricing).every(([kind, price]) => kind === "web_search" || Number(price) === 0)) continue;
    const output = row.architecture?.output_modalities;
    if (Array.isArray(output) && !output.includes("text")) continue;
    // Decision/rerank/image models are not served on chat completions.
    if (Array.isArray(row.endpoints) && !row.endpoints.includes("/api/v1/chat/completions")) continue;
    const context = Number(row.context_length) || 0;
    if (context < 8000) continue;
    const params = Array.isArray(row.supported_parameters) ? row.supported_parameters : [];
    const maxOutput = Number(row.top_provider?.max_completion_tokens);
    seen.add(row.id);
    free.push({
      id: row.id,
      name: typeof row.name === "string" ? row.name : row.id,
      context,
      provider: row.id.split("/")[0],
      description: typeof row.description === "string" ? row.description.slice(0, 300) : undefined,
      expires: typeof row.expiration_date === "string" ? row.expiration_date : null,
      created: Number(row.created) || undefined,
      json: params.includes("response_format") || params.includes("structured_outputs"),
      reasoning: params.includes("reasoning") || params.includes("include_reasoning"),
      maxOutput: Number.isFinite(maxOutput) && maxOutput > 0 ? maxOutput : null,
    });
  }
  return free;
}

let liveMemo: { at: number; list: ModelList } | null = null;

/**
 * Loads the free model list live from OpenRouter. Saves a copy of each good
 * result; if OpenRouter cannot be reached the last saved copy is returned and
 * marked as such so the page can say so.
 */
export async function loadFreeModels(db: SupabaseClient, options: { reuse?: boolean } = {}): Promise<ModelList> {
  if (options.reuse && liveMemo && Date.now() - liveMemo.at < LIVE_REUSE_MS) return liveMemo.list;
  let error = "";
  try {
    const response = await fetch(`${API}/models`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (response.ok) {
      const models = freeModelsFromCatalogue(await response.json());
      const loadedAt = new Date().toISOString();
      const list: ModelList = { models, source: "live", loadedAt };
      liveMemo = { at: Date.now(), list };
      if (models.length) await db.from("ai_settings").update({ model_cache: models, model_cache_at: loadedAt }).eq("id", 1);
      return list;
    }
    error = `OpenRouter answered HTTP ${response.status}`;
  } catch (cause) {
    error = cause instanceof Error && cause.name === "TimeoutError" ? "OpenRouter did not answer within 10 seconds" : "OpenRouter could not be reached";
  }
  const { data } = await db.from("ai_settings").select("model_cache,model_cache_at").eq("id", 1).maybeSingle();
  const saved = Array.isArray(data?.model_cache) ? (data.model_cache as FreeModel[]) : [];
  return saved.length
    ? { models: saved, source: "saved", loadedAt: data?.model_cache_at ? String(data.model_cache_at) : null, error }
    : { models: [], source: "none", loadedAt: null, error };
}

/** Just the models (live, reused for up to a minute within one pass). */
export async function freeModels(db: SupabaseClient): Promise<FreeModel[]> {
  return (await loadFreeModels(db, { reuse: true })).models;
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

/**
 * No local cap: the AI keeps working for as long as OpenRouter accepts its
 * requests. `stopped` is set only when OpenRouter itself says the account's
 * allowance is used up (HTTP 402, or a 429 that names the daily free limit);
 * per-minute "busy" answers just move on to the next model.
 */
export type Budget = { remaining: number; stopped?: string | null };

export function unlimitedBudget(): Budget {
  return { remaining: Number.POSITIVE_INFINITY, stopped: null };
}

/** OpenRouter's own "allowance used up" answers (not a per-minute busy signal). */
export function allowanceExhausted(status: number, message: string): boolean {
  if (status === 402) return true;
  return status === 429 && /per[- ]?day|daily|free-models-per-day|quota|credits?/i.test(message);
}

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
  if (missing.length) await runStep(db, options.runId, `Skipped chosen model${missing.length > 1 ? "s" : ""} no longer free on OpenRouter: ${missing.join(", ")}`);
  let attempts = 0;
  // After the chosen models, keep going down OpenRouter's live free list (fixed
  // order, never shuffled) for as long as there is time and OpenRouter answers.
  const backups = defaultModelIds(catalogue).filter((id) => !queue.includes(id)).slice(0, 6);
  const plan = [...queue, ...backups];
  for (const [position, model] of plan.entries()) {
    if (options.budget.remaining <= 0 || options.budget.stopped) {
      errors.push(options.budget.stopped ?? "OpenRouter refused further requests");
      break;
    }
    const left = options.deadline - Date.now();
    if (left < 15_000) {
      errors.push("run time limit reached");
      break;
    }
    attempts += 1;
    options.budget.remaining -= 1;
    await runStep(db, options.runId, `Asking ${model} (${position === 0 ? "1st choice" : position < queue.length ? `backup ${position} of ${queue.length - 1}` : "extra backup from the free list"})…`);
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
        if (allowanceExhausted(response.status, detail)) {
          failure = `OpenRouter says the allowance is used up (HTTP ${response.status}${detail})`;
          options.budget.stopped = failure;
          options.budget.remaining = 0;
        } else failure = response.status === 429 ? `busy (HTTP 429${detail}) — moved to the next model` : `HTTP ${response.status}${detail}`;
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
              await runStep(db, options.runId, `${used} answered in ${((Date.now() - started) / 1000).toFixed(1)} s.`);
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
    await runStep(db, options.runId, `${model} failed after ${((Date.now() - started) / 1000).toFixed(1)} s: ${failure}${position < plan.length - 1 && !options.budget.stopped ? " — trying the next model" : ""}`);
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
