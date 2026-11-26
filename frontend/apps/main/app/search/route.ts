import { cleanSearchQuery } from "../../lib/site-search";

export const dynamic = "force-dynamic";

/**
 * The standalone search page was replaced by the header search dialog.
 * Old /search and /search?q=… links (bookmarks, shared links, structured data)
 * land on the homepage with the dialog open and the query kept. A relative
 * Location keeps the redirect on whichever host served the request.
 */
export function GET(request: Request) {
  const query = cleanSearchQuery(new URL(request.url).searchParams.get("q"));
  const params = new URLSearchParams({ open: "search" });
  if (query) params.set("q", query);
  return new Response(null, { status: 308, headers: { location: `/?${params.toString()}`, "cache-control": "no-store" } });
}
