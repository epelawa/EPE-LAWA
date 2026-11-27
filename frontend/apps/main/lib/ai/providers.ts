/**
 * Free AI model providers (owner, turn 26): OpenRouter plus Kilo Code, Google
 * AI Studio (Gemini), Groq, Cerebras, Mistral and NVIDIA NIM. Every provider speaks the OpenAI chat
 * completions format. Only free models are ever offered or called:
 *
 * - OpenRouter: ids ending ":free" whose every listed price is 0.
 * - Kilo Code gateway: models the gateway marks free (isFree, or ":free" with
 *   zero prices).
 * - Gemini, Groq, Cerebras, Mistral, NVIDIA NIM: the models these providers serve on their
 *   free API tier (text chat models only; no audio, image, embedding, guard or
 *   OCR models). Their free tier is account-wide, so the keys must come from
 *   free accounts with no billing attached; the admin page says so.
 *
 * OpenRouter ids stay as OpenRouter publishes them ("vendor/model:free"); every
 * other provider's model is stored as "provider@model" so ids never collide.
 */

export type ProviderId = "openrouter" | "kilo" | "gemini" | "groq" | "cerebras" | "mistral" | "nvidia";

export type Provider = {
  id: ProviderId;
  label: string;
  /** Env var names, first match wins. */
  env: string[];
  /** OpenAI-compatible base (…/chat/completions and …/models are appended). */
  base: string;
  /** Where the owner gets a free key. */
  keyUrl: string;
  /** Plain-English note for the admin page. */
  freeNote: string;
};

export const PROVIDERS: readonly Provider[] = [
  { id: "openrouter", label: "OpenRouter", env: ["OPENROUTER_API_KEY"], base: "https://openrouter.ai/api/v1", keyUrl: "https://openrouter.ai/keys", freeNote: "Only \":free\" models with every price at 0." },
  { id: "kilo", label: "Kilo Code", env: ["KILO_API_KEY", "KILOCODE_API_KEY"], base: "https://ai-gateway.kilo.ai/api/v1", keyUrl: "https://app.kilo.ai", freeNote: "Only models the Kilo gateway marks as free." },
  { id: "gemini", label: "Google AI Studio (Gemini)", env: ["GEMINI_API_KEY", "GOOGLE_AI_API_KEY"], base: "https://generativelanguage.googleapis.com/v1beta/openai", keyUrl: "https://aistudio.google.com/apikey", freeNote: "Free tier: about 500–1,500 requests a day per model (Gemini Flash, Flash-Lite, Gemma; 1M-token context). Use a key from a project without billing." },
  { id: "groq", label: "Groq", env: ["GROQ_API_KEY"], base: "https://api.groq.com/openai/v1", keyUrl: "https://console.groq.com/keys", freeNote: "Free plan: about 1,000 requests a day and 30 a minute per model (gpt-oss-120b, Qwen, Llama)." },
  { id: "cerebras", label: "Cerebras", env: ["CEREBRAS_API_KEY"], base: "https://api.cerebras.ai/v1", keyUrl: "https://cloud.cerebras.ai", freeNote: "Chat models on Cerebras's free tier." },
  { id: "mistral", label: "Mistral AI", env: ["MISTRAL_API_KEY"], base: "https://api.mistral.ai/v1", keyUrl: "https://console.mistral.ai/api-keys", freeNote: "Free Experiment plan: about 2,000 requests a day (Mistral Small/Large, Codestral)." },
  { id: "nvidia", label: "NVIDIA NIM", env: ["NVIDIA_API_KEY", "NVIDIA_NIM_API_KEY"], base: "https://integrate.api.nvidia.com/v1", keyUrl: "https://build.nvidia.com", freeNote: "Free developer access to hosted chat models, about 40 requests a minute." },
];

export function providerById(id: string): Provider | undefined {
  return PROVIDERS.find((provider) => provider.id === id);
}

// Real OpenRouter keys look like "sk-or-v1-<hex>". Anything else (for example a
// test value left in Vercel until the owner pastes the real key) is treated as
// "no key", so the desk never sends doomed requests that eat the free allowance.
const OPENROUTER_KEY_PATTERN = /^sk-or-[A-Za-z0-9_-]{20,}$/;
const PLACEHOLDER = /replace|placeholder|your[-_ ]?key|changeme|example|xxxx|^test$|^todo$/i;

/** Keys an administrator saved in the AI Scheduler (decrypted on the server only). */
export type StoredKeys = Partial<Record<ProviderId, string>>;

function rawKey(provider: Provider, env: NodeJS.ProcessEnv, stored?: StoredKeys): string | null {
  const saved = stored?.[provider.id]?.trim();
  if (saved) return saved;
  for (const name of provider.env) {
    const value = env[name]?.trim();
    if (value) return value;
  }
  return null;
}

/** A usable API key for the provider, or null (missing or a placeholder). */
export function providerKey(provider: Provider, env: NodeJS.ProcessEnv = process.env, stored?: StoredKeys): string | null {
  const key = rawKey(provider, env, stored);
  if (!key) return null;
  if (provider.id === "openrouter") return OPENROUTER_KEY_PATTERN.test(key) ? key : null;
  return key.length >= 20 && !PLACEHOLDER.test(key) && /^[\x21-\x7e]+$/.test(key) ? key : null;
}

/** True when the provider's env var is set but is not a usable key (a placeholder). */
export function providerKeyIsPlaceholder(provider: Provider, env: NodeJS.ProcessEnv = process.env, stored?: StoredKeys): boolean {
  return Boolean(rawKey(provider, env, stored)) && providerKey(provider, env, stored) === null;
}

export function configuredProviders(env: NodeJS.ProcessEnv = process.env, stored?: StoredKeys): Provider[] {
  return PROVIDERS.filter((provider) => providerKey(provider, env, stored) !== null);
}

/** Basic shape check for a key typed into the admin page (never logged or echoed back). */
export function plausibleKey(provider: ProviderId, key: string): boolean {
  const value = key.trim();
  if (value.length < 20 || value.length > 400 || !/^[\x21-\x7e]+$/.test(value) || PLACEHOLDER.test(value)) return false;
  if (provider === "openrouter") return OPENROUTER_KEY_PATTERN.test(value);
  return true;
}

/** The id this app stores for a provider's model. */
export function modelRef(provider: ProviderId, model: string): string {
  return provider === "openrouter" ? model : `${provider}@${model}`;
}

/** Splits a stored id into its provider and the provider's own model name. */
export function parseModelRef(ref: string): { provider: ProviderId; model: string } {
  const match = ref.match(/^(kilo|gemini|groq|cerebras|mistral|nvidia)@(.+)$/);
  return match ? { provider: match[1] as ProviderId, model: match[2] } : { provider: "openrouter", model: ref };
}

const OPENROUTER_ID = /^[A-Za-z0-9._~-]+\/[A-Za-z0-9._~/-]+:free$/;
const OTHER_ID = /^(kilo|gemini|groq|cerebras|mistral|nvidia)@[A-Za-z0-9._~/:-]+$/;

/** The only model ids that may be saved or called (mirrors ai_models_save in the database). */
export function isAllowedModelId(id: string): boolean {
  return id.length >= 6 && id.length <= 120 && (OPENROUTER_ID.test(id) || OTHER_ID.test(id));
}

export type FreeModel = {
  id: string;
  name: string;
  context: number;
  /** Which service answers the call. Missing on lists saved before turn 26 (OpenRouter). */
  via?: ProviderId;
  /** The part of the id before "/", as OpenRouter publishes it (e.g. "baidu"). */
  provider?: string;
  description?: string;
  /** OpenRouter's "going away" date, when it announces one. */
  expires?: string | null;
  /** Unix seconds when the provider added the model. */
  created?: number;
  /** The provider says the model supports response_format / structured outputs (reliable JSON). */
  json?: boolean;
  /** The provider says the model thinks before it answers. */
  reasoning?: boolean;
  maxOutput?: number | null;
};

type CatalogueEntry = {
  id?: unknown;
  name?: unknown;
  display_name?: unknown;
  description?: unknown;
  created?: unknown;
  context_length?: unknown;
  context_window?: unknown;
  max_context_length?: unknown;
  expiration_date?: unknown;
  pricing?: Record<string, unknown>;
  architecture?: { output_modalities?: unknown; input_modalities?: unknown };
  supported_parameters?: unknown;
  endpoints?: unknown;
  top_provider?: { max_completion_tokens?: unknown };
  isFree?: unknown;
  active?: unknown;
  capabilities?: { completion_chat?: unknown; function_calling?: unknown };
  type?: unknown;
  deprecation?: unknown;
};

function allPricesZero(pricing: Record<string, unknown> | undefined): boolean {
  if (!pricing || !("prompt" in pricing) || !("completion" in pricing)) return false;
  // Web search is only billed when a request asks for it, and this code never does.
  return Object.entries(pricing).every(([kind, price]) => kind === "web_search" || price === null || Number(price) === 0);
}

/** OpenRouter-shaped catalogue (OpenRouter and the Kilo gateway) → the free chat models, in the provider's order. */
export function freeModelsFromCatalogue(payload: unknown, via: "openrouter" | "kilo" = "openrouter"): FreeModel[] {
  const rows = (payload as { data?: unknown })?.data;
  if (!Array.isArray(rows)) return [];
  const free: FreeModel[] = [];
  const seen = new Set<string>();
  for (const row of rows as CatalogueEntry[]) {
    if (typeof row.id !== "string") continue;
    const id = modelRef(via, row.id);
    if (seen.has(id) || !isAllowedModelId(id)) continue;
    if (via === "openrouter") {
      if (!row.id.endsWith(":free") || !allPricesZero(row.pricing)) continue;
    } else if (!(row.isFree === true || (row.id.endsWith(":free") && allPricesZero(row.pricing)))) continue;
    const output = row.architecture?.output_modalities;
    if (Array.isArray(output) && !output.includes("text")) continue;
    // Decision/rerank/image models are not served on chat completions.
    if (Array.isArray(row.endpoints) && !row.endpoints.includes("/api/v1/chat/completions")) continue;
    const context = Number(row.context_length) || 0;
    if (context < 8000) continue;
    const params = Array.isArray(row.supported_parameters) ? row.supported_parameters : [];
    const maxOutput = Number(row.top_provider?.max_completion_tokens);
    seen.add(id);
    free.push({
      id,
      via,
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

/** Models that are not text chat (audio, images, embeddings, safety classifiers, OCR…). */
const NOT_CHAT = /(whisper|tts|audio|speech|transcri|embed|image|imagen|vision-only|guard|moderation|ocr|rerank|veo|live|native-audio|realtime|computer-use|robotics|aqa|learnlm|playai|orpheus|compound)/i;

/** Gemini models on the free API tier: Flash, Flash-Lite and Gemma (never Pro, Ultra or previews of paid models). */
const GEMINI_FREE = /^(gemini-(2\.0|2\.5|3(\.\d)?)-flash(-lite)?(-\d{3}|-latest|-preview-[\w-]+)?|gemini-flash(-lite)?-latest|gemma-3[\w.-]*)$/;

const KNOWN_CONTEXT: Record<"gemini" | "groq" | "cerebras" | "mistral" | "nvidia", number> = { gemini: 1_000_000, groq: 128_000, cerebras: 64_000, mistral: 128_000, nvidia: 32_000 };

/** NVIDIA's catalogue also hosts retrieval, safety, vision and science models that cannot write a story. */
const NVIDIA_NOT_CHAT = /(nemoguard|reward|safety|parse|retriever|bge|e5-|arctic-embed|nvclip|deplot|kosmos|fuyu|paligemma|neva|vila|cosmos|usdcode|usdsearch|starcoder|codegemma|riva|parakeet|canary|fastpitch|genmol|molmim|esm|diffdock|alphafold|openfold|evo2|msa|proteinmpnn|rfdiffusion|vista|chatqa|-vl|vision|calibration|topic-control|content-safety|jailbreak|pii)/i;

/** A provider's own model list (OpenAI-style `{data:[…]}`) → its free-tier text chat models. */
export function freeModelsFromProviderList(payload: unknown, via: "gemini" | "groq" | "cerebras" | "mistral" | "nvidia"): FreeModel[] {
  const rows = (payload as { data?: unknown; models?: unknown })?.data ?? (payload as { models?: unknown })?.models;
  if (!Array.isArray(rows)) return [];
  const free: FreeModel[] = [];
  const seen = new Set<string>();
  for (const row of rows as CatalogueEntry[]) {
    const raw = typeof row.id === "string" ? row.id : typeof row.name === "string" ? row.name : "";
    const name = raw.replace(/^models\//, "");
    if (!name || NOT_CHAT.test(name)) continue;
    if (row.active === false || row.deprecation) continue;
    if (via === "gemini" && !GEMINI_FREE.test(name)) continue;
    if (via === "mistral" && row.capabilities && row.capabilities.completion_chat === false) continue;
    if (via === "nvidia" && NVIDIA_NOT_CHAT.test(name)) continue;
    const id = modelRef(via, name);
    if (seen.has(id) || !isAllowedModelId(id)) continue;
    seen.add(id);
    const context = Number(row.context_window ?? row.max_context_length ?? row.context_length) || KNOWN_CONTEXT[via];
    if (context < 8000) continue;
    free.push({
      id,
      via,
      name: typeof row.display_name === "string" ? row.display_name : name,
      context,
      provider: via,
      description: typeof row.description === "string" ? row.description.slice(0, 300) : undefined,
      expires: null,
      created: Number(row.created) || undefined,
      json: via !== "gemini" || !name.startsWith("gemma"),
      reasoning: /thinking|reason|r1|qwq|gpt-oss|magistral|2\.5|gemini-3/i.test(name),
      maxOutput: null,
    });
  }
  return free;
}

/**
 * The order a job with no chosen models tries: each provider's best model in
 * turn (round robin, OpenRouter first), so one provider's free allowance is not
 * used up before the others are touched. Within a provider, models with
 * structured (JSON) output come first, then larger context windows.
 */
export function defaultModelIds(catalogue: readonly FreeModel[]): string[] {
  const byProvider = new Map<ProviderId, FreeModel[]>();
  catalogue.forEach((model) => {
    const via = model.via ?? "openrouter";
    byProvider.set(via, [...(byProvider.get(via) ?? []), model]);
  });
  const lists = PROVIDERS.map((provider) => byProvider.get(provider.id) ?? [])
    .filter((list) => list.length)
    .map((list) => list.map((model, index) => ({ model, index })).sort((a, b) => Number(Boolean(b.model.json)) - Number(Boolean(a.model.json)) || b.model.context - a.model.context || a.index - b.index).map(({ model }) => model.id));
  const order: string[] = [];
  for (let round = 0; lists.some((list) => round < list.length); round += 1) {
    for (const list of lists) if (round < list.length) order.push(list[round]);
  }
  return order;
}

/**
 * The exact order a job tries models in: the administrator's choices that are
 * still free in the live lists, else defaultModelIds. No randomness.
 */
export function modelQueue(catalogue: readonly FreeModel[], chosen: readonly string[] | undefined, maxAttempts: number): { queue: string[]; missing: string[]; usingDefault: boolean } {
  const available = new Set(catalogue.map((model) => model.id));
  const picks = (chosen ?? []).filter(isAllowedModelId);
  const missing = picks.filter((id) => !available.has(id));
  const usable = picks.filter((id) => available.has(id));
  const usingDefault = usable.length === 0;
  const queue = (usingDefault ? defaultModelIds(catalogue) : usable).slice(0, Math.max(1, maxAttempts));
  return { queue, missing, usingDefault };
}

/** The request body for one chat call. Only OpenRouter and Kilo accept OpenRouter's extra fields. */
export function chatBody(ref: string, messages: { role: string; content: string }[], options: { temperature: number; maxTokens: number }): Record<string, unknown> {
  const { provider, model } = parseModelRef(ref);
  const body: Record<string, unknown> = { model, messages, temperature: options.temperature, max_tokens: options.maxTokens };
  // Keep "thinking" short so the answer itself fits in the token allowance.
  if (provider === "openrouter" || provider === "kilo") body.reasoning = { effort: "low" };
  if (provider === "gemini" && /^gemini-(2\.5|3)/.test(model)) body.reasoning_effort = "low";
  return body;
}

/** A provider's own "allowance used up" answer (not a per-minute busy signal). */
export function allowanceExhausted(status: number, message: string): boolean {
  if (status === 402) return true;
  return status === 429 && /per[- ]?day|daily|free-models-per-day|quota|credits?|tokens per day|requests per day|\bRPD\b|\bTPD\b/i.test(message);
}
