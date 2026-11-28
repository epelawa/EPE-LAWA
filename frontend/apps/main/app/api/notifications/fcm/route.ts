import { formAdminClient, formRateAllowance, formRateMessage } from "../../../../lib/form-server";
import { WEB_PUSH_READY } from "../../../../lib/vapid";
import { endpointHash, pushCryptoReady, sealPushValue } from "../../../../lib/push-crypto";
import { pushServiceUrl } from "../../../../lib/web-push-send";
import { fcmSenderReady } from "../../../../lib/fcm-send";

export const runtime = "nodejs";

/**
 * Links a Firebase Cloud Messaging token to a device that is already subscribed
 * through /api/notifications/subscribe. The device's push endpoint proves which
 * device is being changed (only that browser knows it), exactly like PATCH on
 * the subscribe route. The token is encrypted at rest like the endpoint.
 *
 * Dormant (503) until the Firebase server variables are set (lib/fcm-send.ts).
 */

const ENDPOINT = /^https:\/\/[^\s"'<>\\]{8,2048}$/;
// FCM registration tokens are long URL-safe strings with a colon separator.
const TOKEN = /^[A-Za-z0-9_:-]{100,4096}$/;
const NO_STORE = { "cache-control": "no-store" };

function error(status: number, message: string) {
  return Response.json({ saved: false, error: { http_code: status, message } }, { status, headers: NO_STORE });
}

export async function POST(request: Request): Promise<Response> {
  if (!WEB_PUSH_READY || !pushCryptoReady() || !fcmSenderReady()) return error(503, "Push messaging is not configured");
  const raw = await request.text().catch(() => "");
  if (raw.length > 12 * 1024) return error(400, "Invalid request");
  let record: Record<string, unknown> | null = null;
  try { const parsed: unknown = JSON.parse(raw); record = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null; } catch { record = null; }
  const endpoint = typeof record?.endpoint === "string" && ENDPOINT.test(record.endpoint) && pushServiceUrl(record.endpoint) ? record.endpoint : null;
  const token = typeof record?.token === "string" && TOKEN.test(record.token) ? record.token : null;
  if (!endpoint || !token) return error(400, "Invalid request");
  try {
    const db = formAdminClient();
    const hash = endpointHash(endpoint);
    // Look the device up before charging the allowance, so invented endpoints cost nothing.
    const existing = await db.from("web_push_devices").select("endpoint_hash").eq("endpoint_hash", hash).maybeSingle();
    if (existing.error) return error(503, "Could not save the token");
    if (!existing.data) return error(404, "This device is not subscribed yet");
    if (!(await formRateAllowance("push_subscribe", 20))) return error(429, await formRateMessage());
    const result = await db.from("web_push_devices")
      .update({ fcm_token_enc: sealPushValue(token), fcm_token_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("endpoint_hash", hash);
    if (result.error) return error(503, "Could not save the token");
    return Response.json({ saved: true }, { headers: NO_STORE });
  } catch {
    return error(503, "Could not save the token");
  }
}
