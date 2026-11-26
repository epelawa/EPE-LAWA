import { createClient } from "../../../../lib/supabase";
import { formRateAllowance, formRateLimitedMessage } from "../../../../lib/form-server";
import { WEB_PUSH_READY } from "../../../../lib/vapid";

export const runtime = "nodejs";

const ENDPOINT = /^https:\/\/[^\s"'<>\\]{8,2048}$/;
const P256DH = /^[A-Za-z0-9_-]{40,512}$/;
const AUTH = /^[A-Za-z0-9_-]{8,512}$/;
const USER_AGENT = /^[^\u0000-\u001f]{0,500}$/;
const MAX_BYTES = 16 * 1024;
const NO_STORE = { "cache-control": "no-store" };

type Topics = { news: boolean; radio: boolean };

function error(status: number, message: string) {
  return Response.json({ saved: false, error: { http_code: status, message } }, { status, headers: NO_STORE });
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  if (!request.body) return null;
  const raw = await request.text();
  if (raw.length > MAX_BYTES) return null;
  try {
    const body: unknown = JSON.parse(raw);
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Topics are optional for older callers; when present both flags must be booleans. */
function parseTopics(record: Record<string, unknown>): Topics | null | "invalid" {
  if (!("topics" in record) || record.topics === undefined) return null;
  const topics = record.topics;
  if (!topics || typeof topics !== "object") return "invalid";
  const { news, radio } = topics as Record<string, unknown>;
  if (typeof news !== "boolean" || typeof radio !== "boolean") return "invalid";
  return { news, radio };
}

async function sessionClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data?.user ?? null };
}

type SessionClient = Awaited<ReturnType<typeof sessionClient>>["supabase"];

/**
 * Writes the member's own push topic flags. RLS limits the row to the caller
 * and `/api/push/dispatch` reads exactly these columns, so a topic left off is
 * never sent.
 */
async function writeTopics(supabase: SessionClient, userId: string, topics: Topics): Promise<Topics | null> {
  const result = await supabase
    .from("notification_preferences")
    .upsert({ user_id: userId, push_news: topics.news, push_radio: topics.radio }, { onConflict: "user_id" })
    .select("push_news,push_radio")
    .maybeSingle();
  if (result.error || !result.data) {
    if (result.error) console.error("notification_preferences write failed", { code: result.error.code });
    return null;
  }
  return { news: result.data.push_news === true, radio: result.data.push_radio === true };
}

/** Current member's push topics (never another member's). */
export async function GET(): Promise<Response> {
  try {
    const { supabase, user } = await sessionClient();
    if (!user) return error(401, "Sign in to manage notification settings");
    const result = await supabase.from("notification_preferences").select("push_news,push_radio").eq("user_id", user.id).maybeSingle();
    if (result.error) return error(503, "Notification settings are unavailable");
    return Response.json({ topics: { news: result.data?.push_news === true, radio: result.data?.push_radio === true } }, { headers: NO_STORE });
  } catch {
    return error(503, "Notification settings are unavailable");
  }
}

/**
 * Stores the subscribing member's Web Push subscription and, when supplied,
 * their topic choices. The user id always comes from the session (the database
 * RPC re-checks it); the browser only supplies the subscription shape. Consent
 * is collected in components/push-onboarding.tsx and the Notification Centre;
 * nothing here can send a message.
 */
export async function POST(request: Request): Promise<Response> {
  if (!WEB_PUSH_READY) return error(503, "Web push is not available");

  const allowed = await formRateAllowance("push_subscribe", 5);
  if (!allowed) return error(429, formRateLimitedMessage);

  const record = await readJson(request);
  if (!record) return error(400, "Invalid request");
  const topics = parseTopics(record);
  if (topics === "invalid") return error(400, "Invalid topics");
  const subscription = typeof record.subscription === "object" && record.subscription !== null
    ? (record.subscription as Record<string, unknown>)
    : record;
  const endpoint = typeof subscription.endpoint === "string" ? subscription.endpoint : "";
  const keys = typeof subscription.keys === "object" && subscription.keys !== null
    ? (subscription.keys as Record<string, unknown>)
    : {};
  const p256dh = typeof keys.p256dh === "string" ? keys.p256dh : "";
  const auth = typeof keys.auth === "string" ? keys.auth : "";
  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 500);
  if (!ENDPOINT.test(endpoint) || !P256DH.test(p256dh) || !AUTH.test(auth) || !USER_AGENT.test(userAgent)) {
    return error(400, "Invalid subscription");
  }

  try {
    const { supabase, user } = await sessionClient();
    if (!user) return error(401, "Sign in to save notification settings");
    const result = await supabase.rpc("push_subscription_register", {
      p_endpoint: endpoint,
      p_p256dh: p256dh,
      p_auth: auth,
      p_user_agent: userAgent,
    });
    if (result.error) {
      console.error("push_subscription_register failed", { code: result.error.code });
      return error(503, "Could not save the subscription");
    }
    if (result.data !== true) return error(403, "Notification settings unavailable for this account");
    if (!topics) return Response.json({ saved: true }, { headers: NO_STORE });
    const stored = await writeTopics(supabase, user.id, topics);
    if (!stored) return error(503, "The device was registered but your topics could not be saved. Please try again.");
    return Response.json({ saved: true, topics: stored }, { headers: NO_STORE });
  } catch {
    return error(503, "Could not save the subscription");
  }
}

/** Changes topics without touching device subscriptions. */
export async function PATCH(request: Request): Promise<Response> {
  const allowed = await formRateAllowance("push_subscribe", 20);
  if (!allowed) return error(429, formRateLimitedMessage);
  const record = await readJson(request);
  const topics = record ? parseTopics(record) : "invalid";
  if (!topics || topics === "invalid") return error(400, "Invalid topics");
  try {
    const { supabase, user } = await sessionClient();
    if (!user) return error(401, "Sign in to save notification settings");
    const stored = await writeTopics(supabase, user.id, topics);
    if (!stored) return error(503, "Your choice could not be saved");
    return Response.json({ saved: true, topics: stored }, { headers: NO_STORE });
  } catch {
    return error(503, "Your choice could not be saved");
  }
}

/** Removes one of the member's own device subscriptions (RLS: owner-only delete). */
export async function DELETE(request: Request): Promise<Response> {
  const allowed = await formRateAllowance("push_subscribe", 20);
  if (!allowed) return error(429, formRateLimitedMessage);
  const record = await readJson(request);
  const endpoint = record && typeof record.endpoint === "string" ? record.endpoint : "";
  if (!ENDPOINT.test(endpoint)) return error(400, "Invalid subscription");
  try {
    const { supabase, user } = await sessionClient();
    if (!user) return error(401, "Sign in to manage notification settings");
    const result = await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);
    if (result.error) {
      console.error("push_subscriptions delete failed", { code: result.error.code });
      return error(503, "Could not remove the subscription");
    }
    return Response.json({ removed: true }, { headers: NO_STORE });
  } catch {
    return error(503, "Could not remove the subscription");
  }
}
