import type { MetadataRoute } from "next";
import { absoluteUrl, isIndexingAllowed } from "../lib/site";
import { createClient } from "../lib/supabase";

/**
 * Only public pages that actually render content. Members pages, the status reference
 * route and anything behind a session stay out.
 */
export const publicPaths = [
  "/",
  "/news",
  "/itan-ilu-mi",
  "/forum",
  "/map",
  "/business-directory",
  "/tourism",
  "/radio",
  "/who-is-who",
  "/about",
  "/contact",
  "/guidelines",
  "/privacy",
  "/terms",
  "/photo-credits",
] as const;

const MAX_PUBLIC_DETAIL_URLS_PER_SECTION = 1000;
type PublishedRow = { slug?: unknown; published_at?: unknown };

/** Pure helper: accept only non-empty public slugs and encode them as one path segment. */
export function buildPublicDetailEntries(prefix: string, rows: readonly PublishedRow[]): MetadataRoute.Sitemap {
  return rows.flatMap((row) => {
    const slug = typeof row?.slug === "string" ? row.slug.trim() : "";
    if (!slug || slug.length > 300) return [];
    const publishedAt = typeof row.published_at === "string" ? new Date(row.published_at) : null;
    const lastModified = publishedAt && Number.isFinite(publishedAt.getTime()) ? publishedAt : undefined;
    return [{
      url: absoluteUrl(`${prefix}/${encodeURIComponent(slug)}`),
      ...(lastModified ? { lastModified } : {}),
    }];
  });
}

function updateListingLastModified(
  entries: MetadataRoute.Sitemap,
  pathname: string,
  rows: readonly PublishedRow[],
): void {
  const dates = rows
    .map((row) => typeof row.published_at === "string" ? new Date(row.published_at).getTime() : Number.NaN)
    .filter(Number.isFinite);
  if (!dates.length) return;
  const index = entries.findIndex((entry) => entry.url === absoluteUrl(pathname));
  if (index >= 0) entries[index] = { ...entries[index], lastModified: new Date(Math.max(...dates)) };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isIndexingAllowed()) return [];
  const entries: MetadataRoute.Sitemap = publicPaths.map((pathname) => ({ url: absoluteUrl(pathname) }));
  try {
    const supabase = await createClient();
    const [articleResult, destinationResult, businessResult, personResult] = await Promise.all([
      supabase.from("published_articles").select("slug,published_at")
        .not("published_at", "is", null).order("published_at", { ascending: false, nullsFirst: false })
        .limit(MAX_PUBLIC_DETAIL_URLS_PER_SECTION),
      // Tourism destinations are inserted only after staff publication; their anon RLS policy is public-read.
      supabase.from("tourism_destinations").select("slug,published_at")
        .order("published_at", { ascending: false, nullsFirst: false }).limit(MAX_PUBLIC_DETAIL_URLS_PER_SECTION),
      // The security-invoker view contains only non-deleted, published businesses.
      supabase.from("published_businesses").select("slug,published_at")
        .order("published_at", { ascending: false, nullsFirst: false }).limit(MAX_PUBLIC_DETAIL_URLS_PER_SECTION),
      // The security-invoker view contains only non-deleted, published people.
      supabase.from("published_people").select("slug,published_at")
        .order("published_at", { ascending: false, nullsFirst: false }).limit(MAX_PUBLIC_DETAIL_URLS_PER_SECTION),
    ]);

    const collections = [
      { pathname: "/news", prefix: "/news", result: articleResult },
      { pathname: "/tourism", prefix: "/tourism", result: destinationResult },
      { pathname: "/business-directory", prefix: "/business-directory", result: businessResult },
      { pathname: "/who-is-who", prefix: "/who-is-who", result: personResult },
    ] as const;
    for (const collection of collections) {
      if (collection.result.error) continue;
      const rows = (collection.result.data ?? []) as PublishedRow[];
      entries.push(...buildPublicDetailEntries(collection.prefix, rows));
      updateListingLastModified(entries, collection.pathname, rows);
    }
  } catch {
    // Static public routes still ship when the database is unreachable.
  }
  return entries;
}
