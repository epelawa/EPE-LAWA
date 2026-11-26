import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { pushDispatchAuthorized, pushSenderReady, type WebPushPayload } from "../../../../lib/web-push-send";
import { fanoutPush } from "../../../../lib/push-fanout";

export const dynamic = "force-dynamic";

/**
 * Server-to-server web-push dispatch. The admin server action publishes a story,
 * then calls this route with a shared secret; the route needs the service role
 * because web_push_devices, notification_preferences and push_subscriptions
 * have no grants for end-user roles. Delivery reaches every opted-in device,
 * guest or member, and endpoints the push service reports as gone are retired
 * in lib/push-fanout.ts.
 */

const KIND_TOPICS = { news_published: "news", radio_live: "radio" } as const;
const URL_PATTERN = /^\/[A-Za-z0-9/_?=&%.-]*$/;

type DispatchBody = { kind: keyof typeof KIND_TOPICS; title: string; body: string; url?: string };

function parseBody(raw: unknown): DispatchBody | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const kindRaw = typeof source.kind === "string" ? source.kind : "";
  if (kindRaw !== "news_published" && kindRaw !== "radio_live") return null;
  const kind = kindRaw as keyof typeof KIND_TOPICS;
  const title = typeof source.title === "string" ? source.title.trim() : "";
  const body = typeof source.body === "string" ? source.body.trim() : "";
  if (!title || title.length > 140 || !body || body.length > 1000) return null;
  if ("url" in source && source.url !== undefined && source.url !== null) {
    if (typeof source.url !== "string") return null;
    const url = source.url;
    if (url.length > 300 || !url.startsWith("/") || url.startsWith("//") || !URL_PATTERN.test(url)) return null;
  }
  return {
    kind,
    title,
    body,
    url: typeof source.url === "string" ? source.url : undefined,
  };
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

export async function POST(request: Request) {
  if (!pushDispatchAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ state: "unauthorized" }, { status: 401, headers: { "cache-control": "no-store" } });
  }
  if (!pushSenderReady()) {
    return NextResponse.json({ state: "not_configured" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
  const supabase = serviceClient();
  if (!supabase) {
    return NextResponse.json({ state: "unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
  try {
    const raw: unknown = await request.json();
    const dispatch = parseBody(raw);
    if (!dispatch) {
      return NextResponse.json({ state: "invalid" }, { status: 400, headers: { "cache-control": "no-store" } });
    }

    const payload: WebPushPayload = { title: dispatch.title, body: dispatch.body, kind: dispatch.kind, url: dispatch.url };
    // Guests and members (web_push_devices) plus legacy member rows from
    // notification_preferences/push_subscriptions; see lib/push-fanout.ts.
    const result = await fanoutPush(supabase, KIND_TOPICS[dispatch.kind], payload);
    if (!result) {
      return NextResponse.json({ state: "unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
    }
    const { sent, gone, failed } = result;
    return NextResponse.json({ state: "ok", sent, gone, failed }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ state: "unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
