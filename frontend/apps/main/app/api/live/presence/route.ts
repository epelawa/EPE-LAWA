import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";

const HEX = /^[a-f0-9]{16,64}$/;

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const slug = typeof (body as { slug?: unknown })?.slug === "string" ? (body as { slug: string }).slug.slice(0, 120).trim() : "";
    const path = typeof (body as { path?: unknown })?.path === "string" ? (body as { path: string }).path.slice(0, 160).trim() : "";
    const sessionHash = typeof (body as { sessionHash?: unknown })?.sessionHash === "string" ? (body as { sessionHash: string }).sessionHash : "";
    if (!slug || !path.startsWith("/") || !HEX.test(sessionHash)) {
      return NextResponse.json({ reading: 0, state: "invalid" }, { headers: { "cache-control": "no-store" } });
    }
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("reader_presence_beat", { p_slug: slug, p_path: path, p_session_hash: sessionHash });
    if (error) throw new Error(error.code);
    return NextResponse.json({ reading: typeof data === "number" ? data : 0, state: "ok" }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ reading: 0, state: "unavailable" }, { headers: { "cache-control": "no-store" } });
  }
}
