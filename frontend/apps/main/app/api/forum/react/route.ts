import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const postId = typeof (body as { postId?: unknown })?.postId === "string" ? (body as { postId: string }).postId : "";
    if (!UUID.test(postId)) return NextResponse.json({ state: "invalid", count: null }, { headers: { "cache-control": "no-store" } });
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("forum_react_toggle", { p_post_id: postId });
    if (error) {
      const code = typeof error === "object" && error && "message" in error ? String((error as { message?: unknown }).message) : "";
      const state = code === "not_authenticated" ? "signin" : code === "member_profile_required" ? "profile" : "unavailable";
      return NextResponse.json({ state, count: null }, { headers: { "cache-control": "no-store" } });
    }
    return NextResponse.json({ state: "ok", count: typeof data === "number" ? data : null }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ state: "unavailable", count: null }, { headers: { "cache-control": "no-store" } });
  }
}
