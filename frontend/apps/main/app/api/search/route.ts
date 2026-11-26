import { NextResponse } from "next/server";
import { cleanSearchQuery, parseSearchCategory, searchSite } from "../../../lib/site-search";

export const dynamic = "force-dynamic";

/** JSON search used by the header search dialog. Read-only; published content only. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = cleanSearchQuery(url.searchParams.get("q"));
  const category = parseSearchCategory(url.searchParams.get("type"));
  const outcome = await searchSite(query, category);
  return NextResponse.json(outcome, {
    status: outcome.state === "error" ? 503 : 200,
    headers: { "cache-control": "no-store" },
  });
}
