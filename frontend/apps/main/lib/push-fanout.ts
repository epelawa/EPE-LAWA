import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { openPushValue } from "./push-crypto";
import { webPushDeliver, type WebPushPayload } from "./web-push-send";
import { fcmDeliver, fcmSenderReady } from "./fcm-send";
import { siteUrl } from "./site";

/**
 * Delivers one notification to every device that opted into the topic:
 * guest and member devices in web_push_devices (encrypted at rest) plus the
 * legacy member-only push_subscriptions rows. Endpoints are de-duplicated, so a
 * member who re-subscribed on the new table is never notified twice. Devices
 * the push service reports as gone (404/410), or rows that no longer decrypt,
 * are removed.
 *
 * When Firebase Cloud Messaging is configured (lib/fcm-send.ts) a device that
 * registered an FCM token is sent through FCM; if FCM refuses it, the token is
 * forgotten and the same device is reached through standard Web Push instead.
 * Each device gets exactly one copy.
 */

export type PushTopic = "news" | "radio";
export type FanoutResult = { sent: number; gone: number; failed: number };

const MAX_DEVICES = 2000;
const CONCURRENCY = 16;

type Target = { endpoint: string; p256dh: string; auth: string; fcmToken?: string | null; retire: () => PromiseLike<unknown>; forgetFcm?: () => PromiseLike<unknown> };

export async function fanoutPush(db: SupabaseClient, topic: PushTopic, payload: WebPushPayload): Promise<FanoutResult | null> {
  const column = topic === "news" ? "push_news" : "push_radio";
  const targets = new Map<string, Target>();
  let failed = 0;
  let gone = 0;
  const useFcm = fcmSenderReady();

  const devices = await db
    .from("web_push_devices")
    .select(useFcm ? "id,endpoint_enc,p256dh_enc,auth_enc,fcm_token_enc" : "id,endpoint_enc,p256dh_enc,auth_enc")
    .eq(column, true)
    .limit(MAX_DEVICES);
  if (devices.error) return null;
  for (const row of (devices.data ?? []) as unknown as Record<string, unknown>[]) {
    const id = String(row.id);
    const endpoint = openPushValue(String(row.endpoint_enc));
    const p256dh = openPushValue(String(row.p256dh_enc));
    const auth = openPushValue(String(row.auth_enc));
    if (!endpoint || !p256dh || !auth) {
      gone += 1;
      await db.from("web_push_devices").delete().eq("id", id);
      continue;
    }
    const fcmToken = useFcm && typeof row.fcm_token_enc === "string" ? openPushValue(row.fcm_token_enc) : null;
    targets.set(endpoint, {
      endpoint, p256dh, auth, fcmToken,
      retire: () => db.from("web_push_devices").delete().eq("id", id),
      forgetFcm: () => db.from("web_push_devices").update({ fcm_token_enc: null, fcm_token_at: null }).eq("id", id),
    });
  }

  // Legacy member subscriptions (before guest push existed).
  const prefs = await db.from("notification_preferences").select("user_id").eq(column, true).limit(MAX_DEVICES);
  const userIds = prefs.error ? [] : (prefs.data ?? []).map((row) => String(row.user_id));
  if (userIds.length) {
    const legacy = await db.from("push_subscriptions").select("id,endpoint,p256dh,auth").in("user_id", userIds).limit(MAX_DEVICES);
    for (const row of legacy.error ? [] : legacy.data ?? []) {
      if (typeof row.endpoint !== "string" || typeof row.p256dh !== "string" || typeof row.auth !== "string") continue;
      if (targets.has(row.endpoint)) continue;
      const id = String(row.id);
      targets.set(row.endpoint, { endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth, retire: () => db.from("push_subscriptions").delete().eq("id", id) });
    }
  }

  const queue = [...targets.values()].slice(0, MAX_DEVICES);
  let sent = 0;
  async function worker() {
    for (let next = queue.shift(); next; next = queue.shift()) {
      try {
        if (next.fcmToken) {
          const outcome = await fcmDeliver(next.fcmToken, payload, siteUrl).catch(() => "failed" as const);
          if (outcome === "sent") { sent += 1; continue; }
          // Token dead or FCM unavailable: fall back to standard Web Push for this device.
          if (outcome === "gone") await next.forgetFcm?.();
        }
        const status = await webPushDeliver(next.endpoint, next.p256dh, next.auth, payload);
        if (status >= 200 && status < 300) sent += 1;
        else if (status === 404 || status === 410) { gone += 1; await next.retire(); }
        else failed += 1;
      } catch {
        failed += 1;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
  return { sent, gone, failed };
}
