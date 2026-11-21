import { createClient } from "./supabase";
import { publishedNewsCover } from "./published-news-cover";

export type StoryCover = {
  src: string;
  alt: string;
};

export type LatestStory = {
  slug: string;
  title: string;
  engagement: { views: number; comments: number; readMinutes: number } | null;
  summary: string | null;
  publishedAt: string | null;
  category: string | null;
  authorName: string | null;
  cover: StoryCover | null;
  breakingUntil: string | null;
};

type PublishedStoryRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  published_at: string | null;
  is_breaking: boolean;
  breaking_until: string | null;
  category_label: string | null;
  author_name: string | null;
  cover_url: string | null;
  cover_alt: string | null;
};

export type PublicListResult<T> =
  | { state: "ok"; items: T[] }
  | { state: "error"; items: [] };

function creditedCover(row: PublishedStoryRow): StoryCover | null {
  const cover = publishedNewsCover(row);
  return cover ? { src: cover.url, alt: cover.alt } : null;
}

/** Read only the verified public article projection; errors never masquerade as an empty newsroom. */
export async function getLatestStories(limit = 3): Promise<PublicListResult<LatestStory>> {
  try {
    const supabase = await createClient();
    const count = Math.max(0, Math.min(Math.trunc(limit), 20));
    if (!count) return { state: "ok", items: [] };
    const columns = "id,slug,title,summary,published_at,is_breaking,breaking_until,category_label,author_name,cover_url,cover_alt";
    const latest = await supabase.from("published_articles").select(columns)
      .order("published_at", { ascending: false, nullsFirst: false }).order("slug", { ascending: true }).limit(count);
    if (latest.error) {
      console.error("homepage published_articles read failed", { code: latest.error.code });
      return { state: "error", items: [] };
    }
    const rows = (latest.data ?? []) as PublishedStoryRow[];
    const engagement = new Map<string, { views: number; comments: number; readMinutes: number }>();
    const ids = rows.map((row) => row.id).filter(Boolean);
    if (ids.length) {
      try {
        const metrics = await supabase.from("published_article_engagement").select("article_id,view_count,comment_count,read_minutes").in("article_id", ids);
        if (!metrics.error) for (const metric of metrics.data ?? []) {
          if (metric.view_count == null || metric.comment_count == null || metric.read_minutes == null) continue;
          const views = Number(metric.view_count), comments = Number(metric.comment_count), readMinutes = Number(metric.read_minutes);
          if ([views, comments, readMinutes].every(Number.isFinite)) engagement.set(metric.article_id, { views, comments, readMinutes });
        }
      } catch { /* Story content remains available if engagement cannot be loaded. */ }
    }
    return {
      state: "ok",
      items: rows.map((row) => ({
        engagement: engagement.get(row.id) ?? null,
        slug: row.slug,
        title: row.title,
        summary: row.summary,
        publishedAt: row.published_at,
        category: row.category_label,
        authorName: typeof row.author_name === "string" ? row.author_name.trim() || null : null,
        cover: creditedCover(row),
        breakingUntil: row.is_breaking ? row.breaking_until : null,
      })),
    };
  } catch {
    return { state: "error", items: [] };
  }
}

export type HomeBreakingStory = { slug: string; title: string; published_at: string | null; breaking_until: string | null };
/** Breaking stories are independent of the latest-three list and may be older. */
export async function getHomeBreakingStories(now: number): Promise<PublicListResult<HomeBreakingStory>> {
  try {
    const supabase = await createClient();
    const result = await supabase.from("published_articles").select("slug,title,published_at,breaking_until")
      .eq("is_breaking", true).gt("breaking_until", new Date(now).toISOString())
      .order("published_at", { ascending:false, nullsFirst:false }).order("slug", {ascending:true}).limit(20);
    if (result.error) { console.error("homepage breaking news read failed", {code:result.error.code}); return {state:"error",items:[]}; }
    return {state:"ok",items:(result.data ?? []) as HomeBreakingStory[]};
  } catch { return {state:"error",items:[]}; }
}
