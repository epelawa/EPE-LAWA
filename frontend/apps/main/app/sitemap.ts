import type { MetadataRoute } from "next";
import { absoluteUrl, isIndexingAllowed } from "../lib/site";
import { createClient } from "../lib/supabase";

/**
 * Only public pages that actually render content. Members pages, the status reference
 * route and anything behind a session stay out.
 */
const publicPaths = [
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
  "/search",
] as const;

const MAX_ARTICLE_URLS = 1000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isIndexingAllowed()) return [];
  const entries: MetadataRoute.Sitemap = publicPaths.map((pathname) => ({ url: absoluteUrl(pathname) }));
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("published_articles")
      .select("slug,published_at")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(MAX_ARTICLE_URLS);
    const articles = (data ?? []).filter(
      (row): row is { slug: string; published_at: string } =>
        typeof row?.slug === "string" && typeof row?.published_at === "string",
    );
    for (const article of articles.reverse()) {
      entries.push({
        url: absoluteUrl(`/news/${encodeURIComponent(article.slug)}`),
        lastModified: new Date(article.published_at),
      });
    }
    const lastmod = articles[0]?.published_at;
    if (typeof lastmod === "string") {
      const index = entries.findIndex((entry) => entry.url.endsWith("/news"));
      if (index >= 0) entries[index] = { ...entries[index], lastModified: new Date(lastmod) };
    }
  } catch { /* The static route list still ships when the newsroom is unreachable. */ }
  return entries;
}
