import { createClient } from "../../../../lib/supabase";
import { formRateAllowance, formRateLimitedMessage } from "../../../../lib/form-server";
import { WEB_PUSH_READY } from "../../../../lib/vapid";

export const runtime = "nodejs";

const ENDPOINT = /^https:\/\/[^\s"'<>\\]{8,2048}$/;
const P256DH = /^[A-Za-z0-9_-]{40,512}$/;
const AUTH = /^[A-Za-z0-9_-]{8,512}$/;
const USER_AGENT = /^[^\u0000-\u001f]{0,500}$/;

function error(status: number, message: string) {
  return Response.json({ saved: false, error: { http_code: status, message } }, { status });
}

/**
 * Stores the subscribing member's Web Push subscription. The user id always
 * comes from the session (the database RPC re-checks it); the browser only
 * supplies the subscription shape. Public consent itself is handled in
 * components/notification-prompt.tsx, and nothing here can send a message.
 */
export async function POST(request: Request): Promise<Response> {
  if (!WEB_PUSH_READY) return error(503, "Web push is not available");

  const allowed = await formRateAllowance("push_subscribe", 5);
  if (!allowed) return error(429, formRateLimitedMessage);

  if (!request.body) return error(400, "Invalid request");
  const MAX_BYTES = 16 * 1024;
  const raw = await request.text();
  if (raw.length > MAX_BYTES) return error(413, "Request too large");
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return error(400, "Invalid request");
  }
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
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
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getUser();
    if (!session?.user) return error(401, "Sign in to save notification settings");
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
    return Response.json({ saved: true });
  } catch {
    return error(503, "Could not save the subscription");
  }
}
