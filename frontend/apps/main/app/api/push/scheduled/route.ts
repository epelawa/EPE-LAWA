import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { pushSenderReady, type WebPushPayload } from "../../../../lib/web-push-send";
import { pushCryptoReady } from "../../../../lib/push-crypto";
import { fanoutPush } from "../../../../lib/push-fanout";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Delivers pushes the database scheduled (push_scheduled_sends). pg_cron runs
 * public.push_radio_tick() every minute; when a radio slot starts (Africa/Lagos
 * time) it queues one send and pings this route via pg_net.
 *
 * No secret is needed: the route can only deliver rows the database itself
 * queued and claims them atomically (push_scheduled_claim), so calling it
 * repeatedly sends nothing extra. Nothing from the request body is used.
 */

const NO_STORE = { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" } as const;

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const parsed = URL.parse(url);
  if (!parsed || parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

type QueuedSend = { id: string; kind: string; title: string; body: string; url: string | null };

export async function POST() {
  if (!pushSenderReady() || !pushCryptoReady()) return NextResponse.json({ state: "not_configured" }, { status: 503, headers: NO_STORE });
  const db = serviceClient();
  if (!db) return NextResponse.json({ state: "unavailable" }, { status: 503, headers: NO_STORE });

  const claimed = await db.rpc("push_scheduled_claim");
  if (claimed.error) {
    console.error("push_scheduled_claim failed", { code: claimed.error.code });
    return NextResponse.json({ state: "unavailable" }, { status: 503, headers: NO_STORE });
  }
  const rows = (claimed.data ?? []) as QueuedSend[];
  let delivered = 0;
  for (const row of rows) {
    const kind = row.kind === "news_published" ? "news_published" : "radio_live";
    const payload: WebPushPayload = { title: row.title, body: row.body, kind, url: row.url ?? undefined };
    const result = await fanoutPush(db, kind === "news_published" ? "news" : "radio", payload);
    await db.from("push_scheduled_sends").update({
      status: result ? "sent" : "failed",
      finished_at: new Date().toISOString(),
      sent: result?.sent ?? 0,
      failed: result ? result.failed : 0,
    }).eq("id", row.id);
    if (result) delivered += result.sent;
  }
  return NextResponse.json({ state: "ok", processed: rows.length, delivered }, { headers: NO_STORE });
}

export function GET() {
  return NextResponse.json({ state: "method_not_allowed" }, { status: 405, headers: { ...NO_STORE, allow: "POST" } });
}
