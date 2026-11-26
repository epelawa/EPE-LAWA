import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { openPushValue } from "./push-crypto";
import { webPushDeliver, type WebPushPayload } from "./web-push-send";

/**
 * Delivers one notification to every device that opted into the topic:
 * guest and member devices in web_push_devices (encrypted at rest) plus the
 * legacy member-only push_subscriptions rows. Endpoints are de-duplicated, so a
 * member who re-subscribed on the new table is never notified twice. Devices
 * the push service reports as gone (404/410), or rows that no longer decrypt,
 * are removed.
 */

export type PushTopic = "news" | "radio";
export type FanoutResult = { sent: number; gone: number; failed: number };

const MAX_DEVICES = 2000;
const CONCURRENCY = 16;

type Target = { endpoint: string; p256dh: string; auth: string; retire: () => PromiseLike<unknown> };

export async function fanoutPush(db: SupabaseClient, topic: PushTopic, payload: WebPushPayload): Promise<FanoutResult | null> {
  const column = topic === "news" ? "push_news" : "push_radio";
  const targets = new Map<string, Target>();
  let failed = 0;
  let gone = 0;

  const devices = await db
    .from("web_push_devices")
    .select("id,endpoint_enc,p256dh_enc,auth_enc")
    .eq(column, true)
    .limit(MAX_DEVICES);
  if (devices.error) return null;
  for (const row of devices.data ?? []) {
    const id = String(row.id);
    const endpoint = openPushValue(String(row.endpoint_enc));
    const p256dh = openPushValue(String(row.p256dh_enc));
    const auth = openPushValue(String(row.auth_enc));
    if (!endpoint || !p256dh || !auth) {
      gone += 1;
      await db.from("web_push_devices").delete().eq("id", id);
      continue;
    }
    targets.set(endpoint, { endpoint, p256dh, auth, retire: () => db.from("web_push_devices").delete().eq("id", id) });
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
