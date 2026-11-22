import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { pushDispatchAuthorized, pushSenderReady, webPushDeliver, type WebPushPayload } from "../../../../lib/web-push-send";

export const dynamic = "force-dynamic";

/**
 * Server-to-server web-push dispatch. The admin server action publishes a story,
 * then calls this route with a shared secret; the route needs the service role
 * because notification_preferences and push_subscriptions have no grants for
 * end-user roles. Endpoints the push service reports as gone are retired here.
 */

const MAX_SUBSCRIPTIONS = 500;
const KIND_COLUMNS = { news_published: "push_news", radio_live: "push_radio" } as const;
const URL_PATTERN = /^\/[A-Za-z0-9/_?=&%.-]*$/;

type DispatchBody = { kind: keyof typeof KIND_COLUMNS; title: string; body: string; url?: string };

function parseBody(raw: unknown): DispatchBody | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const kindRaw = typeof source.kind === "string" ? source.kind : "";
  if (kindRaw !== "news_published" && kindRaw !== "radio_live") return null;
  const kind = kindRaw as keyof typeof KIND_COLUMNS;
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

    const column = KIND_COLUMNS[dispatch.kind];
    const prefs = await supabase
      .from("notification_preferences")
      .select("user_id")
      .eq(column, true)
      .limit(MAX_SUBSCRIPTIONS + 1);
    if (prefs.error) {
      return NextResponse.json({ state: "unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
    }
    const userIds = (prefs.data ?? []).map((row) => String(row.user_id));
    if (!userIds.length) {
      return NextResponse.json({ state: "ok", sent: 0, gone: 0, failed: 0 }, { headers: { "cache-control": "no-store" } });
    }
    const stored = await supabase
      .from("push_subscriptions")
      .select("id,endpoint,p256dh,auth")
      .in("user_id", userIds)
      .limit(MAX_SUBSCRIPTIONS + 1);
    if (stored.error) {
      return NextResponse.json({ state: "unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
    }
    const subscriptions = (stored.data ?? []).slice(0, MAX_SUBSCRIPTIONS);

    const payload: WebPushPayload = { title: dispatch.title, body: dispatch.body, kind: dispatch.kind, url: dispatch.url };
    let sent = 0;
    let gone = 0;
    let failed = 0;
    for (const subscription of subscriptions) {
      if (typeof subscription.endpoint !== "string" || typeof subscription.p256dh !== "string" || typeof subscription.auth !== "string") {
        failed += 1;
        continue;
      }
      try {
        const status = await webPushDeliver(subscription.endpoint, subscription.p256dh, subscription.auth, payload);
        if (status >= 200 && status < 300) {
          sent += 1;
        } else if (status === 404 || status === 410) {
          gone += 1;
          await supabase.from("push_subscriptions").delete().eq("id", String(subscription.id));
        } else {
          failed += 1;
        }
      } catch {
        failed += 1;
      }
    }
    return NextResponse.json({ state: "ok", sent, gone, failed }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ state: "unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
