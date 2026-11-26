import { formAdminClient } from "../../../../../lib/form-server";
import { endpointHash, pushCryptoReady } from "../../../../../lib/push-crypto";
import { pushServiceUrl } from "../../../../../lib/web-push-send";

export const runtime = "nodejs";

const NO_STORE = { "cache-control": "no-store" };
const ENDPOINT = /^https:\/\/[^\s"'<>\\]{8,2048}$/;

/**
 * Reads the topics stored for this browser's own subscription. POST (not GET)
 * so the endpoint never appears in URLs or access logs. Returns
 * `{ subscribed: false }` when the server has no record of the device.
 */
export async function POST(request: Request): Promise<Response> {
  if (!pushCryptoReady()) return Response.json({ subscribed: false, error: { http_code: 503, message: "Unavailable" } }, { status: 503, headers: NO_STORE });
  let endpoint = "";
  try {
    const raw = await request.text();
    if (raw.length <= 4096) {
      const body: unknown = JSON.parse(raw);
      if (body && typeof body === "object" && typeof (body as Record<string, unknown>).endpoint === "string") endpoint = (body as Record<string, string>).endpoint;
    }
  } catch { endpoint = ""; }
  if (!ENDPOINT.test(endpoint) || !pushServiceUrl(endpoint)) return Response.json({ subscribed: false, error: { http_code: 400, message: "Invalid subscription" } }, { status: 400, headers: NO_STORE });
  try {
    const db = formAdminClient();
    const result = await db.from("web_push_devices").select("push_news,push_radio").eq("endpoint_hash", endpointHash(endpoint)).maybeSingle();
    if (result.error) return Response.json({ subscribed: false, error: { http_code: 503, message: "Unavailable" } }, { status: 503, headers: NO_STORE });
    if (!result.data) return Response.json({ subscribed: false }, { headers: NO_STORE });
    return Response.json({ subscribed: true, topics: { news: result.data.push_news === true, radio: result.data.push_radio === true } }, { headers: NO_STORE });
  } catch {
    return Response.json({ subscribed: false, error: { http_code: 503, message: "Unavailable" } }, { status: 503, headers: NO_STORE });
  }
}
