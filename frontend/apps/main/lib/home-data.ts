import { createClient } from "./supabase";
import { publishedNewsCover } from "./published-news-cover";

export type StoryCover = {
  src: string;
  alt: string;
  illustrative: boolean;
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
};

type PublishedStoryRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  published_at: string | null;
  category_label: string | null;
  author_name: string | null;
  og_image_key: string | null;
  cover_url: string | null;
  cover_alt: string | null;
};

export type PublicListResult<T> =
  | { state: "ok"; items: T[] }
  | { state: "error"; items: [] };

function creditedCover(row: PublishedStoryRow): StoryCover | null {
  const cover = publishedNewsCover(row);
  return cover ? { src: cover.url, alt: cover.alt, illustrative: cover.illustrative } : null;
}

/** Read only the verified public article projection; errors never masquerade as an empty newsroom. */
export async function getLatestStories(limit = 3): Promise<PublicListResult<LatestStory>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("published_articles")
      .select("id,slug,title,summary,published_at,category_label,author_name,og_image_key,cover_url,cover_alt")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("slug", { ascending: true })
      .limit(Math.max(0, Math.min(Math.trunc(limit), 20)));

    if (error) {
      console.error("homepage published_articles read failed", { code: error.code });
      return { state: "error", items: [] };
    }

    const rows = (data ?? []) as PublishedStoryRow[];
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
      })),
    };
  } catch {
    return { state: "error", items: [] };
  }
}
