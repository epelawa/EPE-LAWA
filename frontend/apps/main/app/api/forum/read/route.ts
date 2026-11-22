import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const threadId = typeof (body as { threadId?: unknown })?.threadId === "string" ? (body as { threadId: string }).threadId : "";
    if (!UUID.test(threadId)) return NextResponse.json({ state: "invalid" }, { headers: { "cache-control": "no-store" } });
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("forum_thread_read_mark", { p_thread_id: threadId });
    if (error) return NextResponse.json({ state: "unavailable" }, { headers: { "cache-control": "no-store" } });
    return NextResponse.json({ state: data === true ? "ok" : "guest" }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ state: "unavailable" }, { headers: { "cache-control": "no-store" } });
  }
}
