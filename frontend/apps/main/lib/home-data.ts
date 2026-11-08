import { createClient } from "./supabase";

export type LatestStory = {
  slug: string;
  title: string;
  summary: string | null;
  publishedAt: string | null;
  category: string | null;
};

export type PublicListResult<T> =
  | { state: "ok"; items: T[] }
  | { state: "error"; items: [] };

/** Read only the public article projection; errors never masquerade as an empty newsroom. */
export async function getLatestStories(limit = 3): Promise<PublicListResult<LatestStory>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("published_articles")
      .select("slug,title,summary,published_at,category_label")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(Math.max(0, Math.min(Math.trunc(limit), 20)));

    if (error) {
      console.error("homepage published_articles read failed", { code: error.code });
      return { state: "error", items: [] };
    }

    return {
      state: "ok",
      items: (data ?? []).map((row) => ({
        slug: row.slug,
        title: row.title,
        summary: row.summary,
        publishedAt: row.published_at,
        category: row.category_label,
      })),
    };
  } catch {
    return { state: "error", items: [] };
  }
}
