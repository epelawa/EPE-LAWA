import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normaliseJobModels, type ModelJob } from "./settings";
import { runStep } from "./activity";
import { loadStoredKeys } from "./key-vault";
import {
  allowanceExhausted, chatBody, configuredProviders, defaultModelIds, freeModelsFromCatalogue, freeModelsFromProviderList, modelQueue,
  parseModelRef, providerById, providerKey, providerKeyIsPlaceholder, PROVIDERS, type FreeModel, type Provider, type ProviderId, type StoredKeys,
} from "./providers";

export { allowanceExhausted, defaultModelIds, freeModelsFromCatalogue, modelQueue, type FreeModel } from "./providers";

/**
 * Free models only, from OpenRouter and the other free providers in
 * ./providers (Kilo Code, Gemini, Groq, Cerebras, Mistral). Each provider's
 * model list is loaded live every time it is needed; nothing is hardcoded.
 * Administrators pick, per job, which models to use and in what order on the
 * AI Scheduler page; a call tries them in that order (no shuffling) and moves to
 * the next one when a model is busy, empty or slow. A copy of the last good
 * list is kept only so the page still works if a provider is briefly
 * unreachable. Failed attempts count against each provider's free allowance,
 * so every attempt is recorded; there is no local budget — a provider is left
 * alone for the rest of the pass only when it says its allowance is used up.
 * Paid models are never sent.
 */

// Within one server instance the live list is reused for one minute, so a pass
// that calls several jobs does not download the catalogues each time.
const LIVE_REUSE_MS = 60_000;

/** Keys saved on the admin page, decrypted on the server; refreshed by refreshKeys(). */
let storedKeys: StoredKeys = {};

/** Loads the keys saved on the admin page (encrypted at rest) for this server instance. */
export async function refreshKeys(db: SupabaseClient): Promise<StoredKeys> {
  try { storedKeys = await loadStoredKeys(db); } catch { /* keep the last good copy */ }
  return storedKeys;
}

export type ModelList = {
  models: FreeModel[];
  source: "live" | "saved" | "none";
  loadedAt: string | null;
  error?: string;
  /** Per provider: how many free models were loaded, and any problem. */
  providers?: Partial<Record<ProviderId, { count: number; source: "live" | "saved" | "none"; error?: string }>>;
};
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type ModelResult<T> = { ok: true; data: T; model: string; attempts: number } | { ok: false; error: string; attempts: number };

const openRouter = providerById("openrouter")!;

export function openRouterKey(env: NodeJS.ProcessEnv = process.env): string | null {
  return providerKey(openRouter, env, env === process.env ? storedKeys : undefined);
}

/** True when OPENROUTER_API_KEY is set but is not a real OpenRouter key (a placeholder). */
export function openRouterKeyIsPlaceholder(env: NodeJS.ProcessEnv = process.env): boolean {
  return providerKeyIsPlaceholder(openRouter, env, env === process.env ? storedKeys : undefined);
}

/** True when at least one free provider has a usable key (call refreshKeys first). */
export function anyAiKey(env: NodeJS.ProcessEnv = process.env): boolean {
  return configuredProviders(env, storedKeys).length > 0;
}

/** Per provider: is a usable key available, and where from. Never the key itself. */
export function providerStatuses(env: NodeJS.ProcessEnv = process.env) {
  return PROVIDERS.map((provider) => ({
    provider,
    configured: providerKey(provider, env, storedKeys) !== null,
    placeholder: providerKeyIsPlaceholder(provider, env, storedKeys),
    from: storedKeys[provider.id] ? ("saved" as const) : providerKey(provider, env) ? ("env" as const) : null,
  }));
}

function baseFor(provider: Provider): string {
  if (provider.id === "kilo" && process.env.KILO_AI_GATEWAY_URL?.startsWith("https://")) return process.env.KILO_AI_GATEWAY_URL.replace(/\/+$/, "");
  return provider.base;
}

function headers(provider: Provider, key: string): Record<string, string> {
  const base: Record<string, string> = { authorization: `Bearer ${key}`, "content-type": "application/json" };
  if (provider.id === "openrouter" || provider.id === "kilo") {
    base["http-referer"] = "https://epelawa.vercel.app";
    base["x-title"] = "EPE LAWA AI Desk";
  }
  return base;
}

async function loadProvider(provider: Provider): Promise<{ models: FreeModel[]; error?: string }> {
  const key = providerKey(provider, process.env, storedKeys);
  try {
    const response = await fetch(`${baseFor(provider)}/models`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      // OpenRouter's catalogue is public; the others need the key.
      headers: key ? headers(provider, key) : undefined,
    });
    if (!response.ok) return { models: [], error: `${provider.label} answered HTTP ${response.status}` };
    const payload = await response.json();
    const models = provider.id === "openrouter" || provider.id === "kilo" ? freeModelsFromCatalogue(payload, provider.id) : freeModelsFromProviderList(payload, provider.id);
    return { models };
  } catch (cause) {
    return { models: [], error: cause instanceof Error && cause.name === "TimeoutError" ? `${provider.label} did not answer within 10 seconds` : `${provider.label} could not be reached` };
  }
}

let liveMemo: { at: number; list: ModelList } | null = null;

/**
 * Loads the free model lists live from every provider that has a key
 * (OpenRouter's public list is shown even without one, so the page is never
 * empty). Saves a copy of each good result; a provider that cannot be reached
 * falls back to its part of the last saved copy, and the page says so.
 */
export async function loadFreeModels(db: SupabaseClient, options: { reuse?: boolean } = {}): Promise<ModelList> {
  if (options.reuse && liveMemo && Date.now() - liveMemo.at < LIVE_REUSE_MS) return liveMemo.list;
  await refreshKeys(db);
  const configured = configuredProviders(process.env, storedKeys);
  const wanted = configured.length ? configured : [openRouter];
  const [results, savedRow] = await Promise.all([
    Promise.all(wanted.map((provider) => loadProvider(provider))),
    db.from("ai_settings").select("model_cache,model_cache_at").eq("id", 1).maybeSingle(),
  ]);
  const saved = Array.isArray(savedRow.data?.model_cache) ? (savedRow.data.model_cache as FreeModel[]) : [];
  const models: FreeModel[] = [];
  const providers: ModelList["providers"] = {};
  const errors: string[] = [];
  let usedSaved = false;
  wanted.forEach((provider, index) => {
    const result = results[index];
    if (result.models.length) {
      models.push(...result.models);
      providers[provider.id] = { count: result.models.length, source: "live" };
      return;
    }
    const fallback = saved.filter((model) => (model.via ?? "openrouter") === provider.id);
    if (result.error) errors.push(result.error);
    if (fallback.length) {
      usedSaved = true;
      models.push(...fallback);
      providers[provider.id] = { count: fallback.length, source: "saved", error: result.error };
    } else providers[provider.id] = { count: 0, source: "none", error: result.error ?? `${provider.label} lists no free models right now` };
  });
  const loadedAt = new Date().toISOString();
  const liveCount = Object.values(providers).filter((entry) => entry?.source === "live").length;
  const list: ModelList = {
    models,
    source: !models.length ? "none" : usedSaved || liveCount < wanted.length ? "saved" : "live",
    loadedAt: usedSaved && savedRow.data?.model_cache_at ? String(savedRow.data.model_cache_at) : models.length ? loadedAt : null,
    error: errors.join("; ") || undefined,
    providers,
  };
  if (liveCount && !usedSaved) await db.from("ai_settings").update({ model_cache: models, model_cache_at: loadedAt }).eq("id", 1);
  liveMemo = { at: Date.now(), list };
  return list;
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
export async function keyStatus(env: NodeJS.ProcessEnv = process.env, db?: SupabaseClient): Promise<KeyStatus> {
  if (db) await refreshKeys(db);
  const key = openRouterKey(env);
  if (!key) return { configured: false, reachable: false, placeholder: openRouterKeyIsPlaceholder(env) };
  try {
    const response = await fetch(`${openRouter.base}/key`, { cache: "no-store", headers: headers(openRouter, key), signal: AbortSignal.timeout(6000) });
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
export type Budget = {
  remaining: number;
  /** Set only when every provider with a key has said its allowance is used up. */
  stopped?: string | null;
  /** Providers that said their allowance is used up during this pass, with their message. */
  exhausted?: Partial<Record<ProviderId, string>>;
};

export function unlimitedBudget(): Budget {
  return { remaining: Number.POSITIVE_INFINITY, stopped: null, exhausted: {} };
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
  await refreshKeys(db);
  if (!anyAiKey()) return { ok: false, error: "No AI provider key is saved. Add a free key on the AI Scheduler page.", attempts: 0 };
  const exhausted = (options.budget.exhausted ??= {});
  const [catalogue, settingsRow] = await Promise.all([
    freeModels(db),
    db.from("ai_settings").select("job_models").eq("id", 1).maybeSingle(),
  ]);
  const chosen = normaliseJobModels(settingsRow.data?.job_models)[options.job];
  const { queue, missing } = modelQueue(catalogue, chosen, options.maxAttempts ?? 4);
  const errors: string[] = [];
  if (missing.length) errors.push(`chosen model${missing.length > 1 ? "s" : ""} no longer free, skipped: ${missing.join(", ")}`);
  if (!queue.length) return { ok: false, error: [...errors, "no free model available"].join("; "), attempts: 0 };
  if (missing.length) await runStep(db, options.runId, `Skipped chosen model${missing.length > 1 ? "s" : ""} that are no longer free: ${missing.join(", ")}`);
  let attempts = 0;
  // After the chosen models, keep going down the live free lists (fixed order,
  // spread across providers, never shuffled) while there is time.
  const backups = defaultModelIds(catalogue).filter((id) => !queue.includes(id)).slice(0, 6);
  const plan = [...queue, ...backups];
  const configured = configuredProviders(process.env, storedKeys);
  for (const [position, model] of plan.entries()) {
    if (options.budget.remaining <= 0 || options.budget.stopped) {
      errors.push(options.budget.stopped ?? "every provider refused further requests");
      break;
    }
    const left = options.deadline - Date.now();
    if (left < 15_000) {
      errors.push("run time limit reached");
      break;
    }
    const route = parseModelRef(model);
    const provider = providerById(route.provider)!;
    const key = providerKey(provider, process.env, storedKeys);
    if (!key || exhausted[provider.id]) continue;
    attempts += 1;
    options.budget.remaining -= 1;
    await runStep(db, options.runId, `Asking ${model} on ${provider.label} (${position === 0 ? "1st choice" : position < queue.length ? `backup ${position} of ${queue.length - 1}` : "extra backup from the free lists"})…`);
    const started = Date.now();
    let status: number | null = null;
    let failure: string | null = null;
    try {
      const response = await fetch(`${baseFor(provider)}/chat/completions`, {
        method: "POST",
        cache: "no-store",
        headers: headers(provider, key),
        signal: AbortSignal.timeout(Math.min(options.timeoutMs ?? 45_000, left - 5000)),
        body: JSON.stringify(chatBody(model, options.messages, { temperature: options.temperature ?? 0.3, maxTokens: options.maxTokens ?? 3000 })),
      });
      status = response.status;
      const raw = (await response.json().catch(() => null)) as unknown;
      // Gemini sometimes wraps errors in a one-item array.
      const body = (Array.isArray(raw) ? raw[0] : raw) as { choices?: { finish_reason?: unknown; message?: { content?: unknown; reasoning?: unknown; reasoning_content?: unknown } }[]; error?: { message?: unknown } | string; message?: unknown; detail?: unknown; model?: unknown } | null;
      if (!response.ok) {
        const message = typeof body?.error === "string" ? body.error : typeof body?.error?.message === "string" ? body.error.message : typeof body?.message === "string" ? body.message : typeof body?.detail === "string" ? body.detail : "";
        const detail = message ? `: ${message.slice(0, 300)}` : "";
        if (allowanceExhausted(response.status, detail)) {
          failure = `${provider.label} says its free allowance is used up (HTTP ${response.status}${detail}) — leaving ${provider.label} alone for this pass`;
          exhausted[provider.id] = failure;
          if (configured.every((entry) => exhausted[entry.id])) {
            options.budget.stopped = `every provider's free allowance is used up (${configured.map((entry) => entry.label).join(", ")})`;
            options.budget.remaining = 0;
          }
        } else failure = response.status === 429 ? `busy (HTTP 429${detail}) — moved to the next model` : `HTTP ${response.status}${detail}`;
      } else {
        const choice = body?.choices?.[0];
        const message = choice?.message;
        const { text } = replyText({ content: message?.content, reasoning: message?.reasoning ?? message?.reasoning_content });
        if (!text) failure = choice?.finish_reason === "length" ? "ran out of tokens while thinking (empty reply)" : "empty reply";
        else {
          try {
            const value = options.validate(parseJsonReply(text));
            if (!value) failure = "reply did not match the required format";
            else {
              const used = typeof body?.model === "string" && route.provider === "openrouter" ? body.model : model;
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
  if (!attempts && !errors.length) errors.push("every chosen model's provider is out of allowance or has no key");
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
