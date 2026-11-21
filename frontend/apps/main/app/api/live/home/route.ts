import { NextResponse } from "next/server";
import { getHomeBreakingStories, getLatestStories } from "../../../../lib/home-data";

export const dynamic = "force-dynamic";

// Lightweight live feed for open pages: breaking stories and the newest
// published stories. Public data only, no caching, no personal data.
export async function GET() {
  const at = Date.now();
  const [breaking, latest] = await Promise.all([getHomeBreakingStories(at), getLatestStories(8)]);
  return NextResponse.json({ at, breaking, latest }, { headers: { "cache-control": "no-store" } });
}
