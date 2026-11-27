import "server-only";
import { createClient } from "./supabase";
import { buildOrIlikeContains, escapePostgrestLikeTerm } from "./postgrest-search";

/**
 * Site-wide search shared by the header search dialog (via /api/search).
 * Every bucket reads only published/public collections through the caller's
 * session, so row-level security decides visibility exactly as on the pages
 * that link to the results. Nothing here invents, ranks or pads results.
 */

export const SEARCH_CATEGORIES = ["all", "news", "businesses", "places", "people", "forum"] as const;
export type SearchCategory = (typeof SEARCH_CATEGORIES)[number];
export type SearchHit = { title: string; href: string; subline: string | null };
export type SearchGroup = { key: Exclude<SearchCategory, "all">; label: string; items: SearchHit[] };
export type SearchOutcome = { state: "ok"; query: string; total: number; groups: SearchGroup[] } | { state: "error"; query: string };

export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 100;

export function cleanSearchQuery(value: unknown): string {
  const raw = typeof value === "string" ? value : "";
  return raw.trim().slice(0, SEARCH_MAX_LENGTH).replace(/[^\p{L}\p{N} '\u2019-]/gu, " ").replace(/\s+/g, " ").trim();
}

export function parseSearchCategory(value: unknown): SearchCategory {
  return SEARCH_CATEGORIES.includes(value as SearchCategory) ? (value as SearchCategory) : "all";
}

type Row = Record<string, unknown>;
const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);
const shortDate = (value: unknown) => typeof value === "string"
  ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" })
  : null;

const LIMITS = { all: 5, single: 12 };

export async function searchSite(query: string, category: SearchCategory = "all"): Promise<SearchOutcome> {
  if (query.length < SEARCH_MIN_LENGTH) return { state: "ok", query, total: 0, groups: [] };
  const limit = category === "all" ? LIMITS.all : LIMITS.single;
  const wants = (key: Exclude<SearchCategory, "all">) => category === "all" || category === key;
  try {
    const supabase = await createClient();
    const empty = Promise.resolve({ data: [] as Row[], error: null });
    const [articles, businesses, destinations, people, threads] = await Promise.all([
      wants("news") ? supabase.from("published_articles").select("slug,title,summary,published_at,category_label")
        .or(buildOrIlikeContains(["title", "summary"], query))
        .order("published_at", { ascending: false, nullsFirst: false }).limit(limit) : empty,
      wants("businesses") ? supabase.rpc("business_discovery_search", { p_query: query, p_area: "", p_category: "", p_offset: 0 })
        .select("slug,name,category_label,area").limit(limit) : empty,
      wants("places") ? supabase.from("tourism_destinations").select("slug,name,location_label")
        .or(buildOrIlikeContains(["name", "description"], query))
        .order("name", { ascending: true }).limit(limit) : empty,
      wants("people") ? supabase.from("published_people").select("slug,full_name,preferred_name,is_verified")
        .or(buildOrIlikeContains(["full_name", "preferred_name"], query))
        .order("full_name", { ascending: true }).limit(limit) : empty,
      wants("forum") ? supabase.from("forum_threads").select("slug,title,post_count,last_activity_at")
        .ilike("title", `%${escapePostgrestLikeTerm(query)}%`).in("state", ["open", "locked"]).is("deleted_at", null)
        .order("last_activity_at", { ascending: false, nullsFirst: false }).limit(limit) : empty,
    ]);
    if ([articles, businesses, destinations, people, threads].some((result) => Boolean(result.error))) return { state: "error", query };
    const rows = (result: { data: unknown }) => (Array.isArray(result.data) ? result.data : []) as Row[];
    const slugHref = (base: string, row: Row) => `${base}/${encodeURIComponent(String(row.slug ?? ""))}`;
    const groups: SearchGroup[] = [
      { key: "news" as const, label: "News", items: rows(articles).map((row) => ({ title: String(row.title ?? ""), href: slugHref("/news", row), subline: [text(row.category_label), shortDate(row.published_at)].filter(Boolean).join(" · ") || null })) },
      { key: "businesses" as const, label: "Businesses", items: rows(businesses).map((row) => ({ title: String(row.name ?? ""), href: slugHref("/business-directory", row), subline: [text(row.category_label), text(row.area)].filter(Boolean).join(" · ") || null })) },
      { key: "places" as const, label: "Places", items: rows(destinations).map((row) => ({ title: String(row.name ?? ""), href: slugHref("/tourism", row), subline: text(row.location_label) })) },
      { key: "people" as const, label: "People", items: rows(people).map((row) => ({ title: String(row.preferred_name || row.full_name || ""), href: slugHref("/who-is-who", row), subline: row.is_verified ? "Verified profile" : null })) },
      { key: "forum" as const, label: "Forum", items: rows(threads).map((row) => ({ title: String(row.title ?? ""), href: slugHref("/forum/thread", row), subline: `${Number(row.post_count ?? 0)} ${Number(row.post_count) === 1 ? "message" : "messages"}` })) },
    ].map((group) => ({ ...group, items: group.items.filter((item) => item.title && !item.href.endsWith("/")) })).filter((group) => group.items.length > 0);
    return { state: "ok", query, total: groups.reduce((sum, group) => sum + group.items.length, 0), groups };
  } catch {
    return { state: "error", query };
  }
}
