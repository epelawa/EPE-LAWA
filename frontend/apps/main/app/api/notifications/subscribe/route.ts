import { createClient } from "../../../../lib/supabase";
import { formAdminClient, formRateAllowance, formRateMessage } from "../../../../lib/form-server";
import { WEB_PUSH_READY } from "../../../../lib/vapid";
import { endpointHash, pushCryptoReady, sealPushValue } from "../../../../lib/push-crypto";
import { pushServiceUrl } from "../../../../lib/web-push-send";

export const runtime = "nodejs";

/**
 * Web Push subscriptions for everyone — no account needed (owner brief, turn 4).
 *
 * A device is identified by its own push endpoint, which only that browser
 * knows; possession of it is what authorises changing or removing that one
 * device's topics. Endpoints and keys are encrypted before storage
 * (lib/push-crypto.ts) in web_push_devices, which only the service role can
 * read. Signed-in members additionally get their account-wide preference row
 * (notification_preferences) kept in step, so the dashboard shows the same
 * choice. Consent is collected in components/push-onboarding.tsx and the
 * Notification Centre; permission is only requested from a click.
 */

const ENDPOINT = /^https:\/\/[^\s"'<>\\]{8,2048}$/;
const P256DH = /^[A-Za-z0-9_-]{40,512}$/;
const AUTH = /^[A-Za-z0-9_-]{8,512}$/;
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

function validEndpoint(value: unknown): string | null {
  const endpoint = typeof value === "string" ? value : "";
  return ENDPOINT.test(endpoint) && pushServiceUrl(endpoint) ? endpoint : null;
}

/** The signed-in member, if any. Guests are fully supported; this never fails the request. */
async function optionalMember() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data?.user ? { supabase, userId: data.user.id } : null;
  } catch {
    return null;
  }
}

/** Keeps a member's account-wide preference row in step (RLS: own row only). */
async function writeMemberTopics(member: NonNullable<Awaited<ReturnType<typeof optionalMember>>>, topics: Topics): Promise<void> {
  const result = await member.supabase
    .from("notification_preferences")
    .upsert({ user_id: member.userId, push_news: topics.news, push_radio: topics.radio }, { onConflict: "user_id" });
  if (result.error) console.error("notification_preferences write failed", { code: result.error.code });
}

function serviceReady(): boolean {
  return WEB_PUSH_READY && pushCryptoReady();
}

/** Account-wide topics for a signed-in member (legacy dashboard read). Guests read via /status. */
export async function GET(): Promise<Response> {
  const member = await optionalMember();
  if (!member) return Response.json({ topics: null, guest: true }, { headers: NO_STORE });
  const result = await member.supabase.from("notification_preferences").select("push_news,push_radio").eq("user_id", member.userId).maybeSingle();
  if (result.error) return error(503, "Notification settings are unavailable");
  return Response.json({ topics: { news: result.data?.push_news === true, radio: result.data?.push_radio === true } }, { headers: NO_STORE });
}

/** Registers (or refreshes) this browser's subscription and its topics. */
export async function POST(request: Request): Promise<Response> {
  if (!serviceReady()) return error(503, "Web push is not available");

  const record = await readJson(request);
  if (!record) return error(400, "Invalid request");
  const topics = parseTopics(record);
  if (topics === "invalid") return error(400, "Invalid topics");
  const subscription = typeof record.subscription === "object" && record.subscription !== null
    ? (record.subscription as Record<string, unknown>)
    : record;
  const endpoint = validEndpoint(subscription.endpoint);
  const keys = typeof subscription.keys === "object" && subscription.keys !== null
    ? (subscription.keys as Record<string, unknown>)
    : {};
  const p256dh = typeof keys.p256dh === "string" ? keys.p256dh : "";
  const auth = typeof keys.auth === "string" ? keys.auth : "";
  if (!endpoint || !P256DH.test(p256dh) || !AUTH.test(auth)) return error(400, "Invalid subscription");

  // Counted only for well-formed requests, so a broken browser call never uses up the allowance.
  const allowed = await formRateAllowance("push_subscribe", 5);
  if (!allowed) return error(429, await formRateMessage());

  const chosen: Topics = topics ?? { news: true, radio: true };
  try {
    const member = await optionalMember();
    const db = formAdminClient();
    const hash = endpointHash(endpoint);
    const result = await db.from("web_push_devices").upsert({
      endpoint_hash: hash,
      endpoint_enc: sealPushValue(endpoint),
      p256dh_enc: sealPushValue(p256dh),
      auth_enc: sealPushValue(auth),
      key_version: 1,
      user_id: member?.userId ?? null,
      push_news: chosen.news,
      push_radio: chosen.radio,
      failed_count: 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: "endpoint_hash" }).select("push_news,push_radio").maybeSingle();
    if (result.error || !result.data) {
      console.error("web_push_devices upsert failed", { code: result.error?.code });
      return error(503, "Could not save the subscription");
    }
    if (member) {
      // The device now lives in web_push_devices; drop the legacy copy so it is never notified twice.
      await db.from("push_subscriptions").delete().eq("user_id", member.userId).eq("endpoint", endpoint);
      await writeMemberTopics(member, chosen);
    }
    return Response.json({ saved: true, topics: { news: result.data.push_news === true, radio: result.data.push_radio === true } }, { headers: NO_STORE });
  } catch (cause) {
    console.error("push subscribe failed", { message: cause instanceof Error ? cause.message : "unknown" });
    return error(503, "Could not save the subscription");
  }
}

/** Changes this device's topics. The endpoint proves which device is being changed. */
export async function PATCH(request: Request): Promise<Response> {
  if (!serviceReady()) return error(503, "Web push is not available");
  const record = await readJson(request);
  const topics = record ? parseTopics(record) : "invalid";
  if (!topics || topics === "invalid") return error(400, "Invalid topics");
  const endpoint = validEndpoint(record?.endpoint);
  if (!endpoint) return error(400, "Invalid subscription");
  const allowed = await formRateAllowance("push_subscribe", 20);
  if (!allowed) return error(429, await formRateMessage());
  try {
    const db = formAdminClient();
    const result = await db.from("web_push_devices")
      .update({ push_news: topics.news, push_radio: topics.radio, updated_at: new Date().toISOString() })
      .eq("endpoint_hash", endpointHash(endpoint))
      .select("push_news,push_radio")
      .maybeSingle();
    if (result.error) return error(503, "Your choice could not be saved");
    if (!result.data) return error(404, "This device is not subscribed yet");
    const member = await optionalMember();
    if (member) await writeMemberTopics(member, topics);
    return Response.json({ saved: true, topics: { news: result.data.push_news === true, radio: result.data.push_radio === true } }, { headers: NO_STORE });
  } catch {
    return error(503, "Your choice could not be saved");
  }
}

/** Removes this device's subscription (guest or member). */
export async function DELETE(request: Request): Promise<Response> {
  const record = await readJson(request);
  const endpoint = validEndpoint(record?.endpoint);
  if (!endpoint) return error(400, "Invalid subscription");
  const allowed = await formRateAllowance("push_subscribe", 20);
  if (!allowed) return error(429, await formRateMessage());
  try {
    const db = formAdminClient();
    if (pushCryptoReady()) {
      const removed = await db.from("web_push_devices").delete().eq("endpoint_hash", endpointHash(endpoint));
      if (removed.error) {
        console.error("web_push_devices delete failed", { code: removed.error.code });
        return error(503, "Could not remove the subscription");
      }
    }
    // Legacy member rows store the endpoint in clear; remove any copy for this device.
    await db.from("push_subscriptions").delete().eq("endpoint", endpoint);
    return Response.json({ removed: true }, { headers: NO_STORE });
  } catch {
    return error(503, "Could not remove the subscription");
  }
}
