import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";

// Public forum activity feed: how many conversations were active in the
// last 15 minutes. Aggregate only; no member data.
export async function GET() {
  try {
    const supabase = await createClient();
    const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count, error } = await supabase
      .from("forum_threads")
      .select("id", { count: "exact", head: true })
      .in("state", ["open", "locked"])
      .is("deleted_at", null)
      .gt("last_activity_at", cutoff);
    if (error) return NextResponse.json({ active: 0, state: "unavailable" }, { headers: { "cache-control": "no-store" } });
    return NextResponse.json({ active: count ?? 0, state: "ok" }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ active: 0, state: "unavailable" }, { headers: { "cache-control": "no-store" } });
  }
}
