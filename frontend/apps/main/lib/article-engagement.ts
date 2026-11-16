import type { createClient } from "./supabase";

export type ArticleEngagement = { views: number; comments: number };

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Reads the public aggregate for one published article. The view returns only
 * totals (views, visible comments) — never a viewer key or a member identity.
 * A missing relation or provider failure returns `null` so the article page can
 * honestly omit the view count instead of inventing one.
 */
export async function loadArticleEngagement(
  supabase: SupabaseClient,
  articleId: string,
): Promise<ArticleEngagement | null> {
  try {
    const { data, error } = await supabase
      .from("published_article_engagement")
      .select("view_count,comment_count")
      .eq("article_id", articleId)
      .maybeSingle();
    if (error) {
      console.error("article engagement read failed", { code: error.code });
      return null;
    }
    if (!data) return null;
    const row = data as { view_count: number | string; comment_count: number | string };
    return {
      views: Number(row.view_count) || 0,
      comments: Number(row.comment_count) || 0,
    };
  } catch {
    return null;
  }
}
