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
    const views = row.view_count == null ? NaN : Number(row.view_count);
    const comments = row.comment_count == null ? NaN : Number(row.comment_count);
    if (!Number.isSafeInteger(views) || views < 0 || !Number.isSafeInteger(comments) || comments < 0) return null;
    return { views, comments };
  } catch {
    return null;
  }
}

export type StoryEngagement = { views: number; comments: number; readMinutes: number };

/**
 * Real numbers for a list of published stories in one query: unique daily
 * views, visible comments and the estimated read time. Stories whose numbers
 * cannot be read are simply missing from the map.
 */
export async function loadEngagementMap(
  supabase: SupabaseClient,
  articleIds: string[],
): Promise<Map<string, StoryEngagement>> {
  const map = new Map<string, StoryEngagement>();
  const ids = [...new Set(articleIds.filter(Boolean))];
  if (!ids.length) return map;
  try {
    const { data, error } = await supabase
      .from("published_article_engagement")
      .select("article_id,view_count,comment_count,read_minutes")
      .in("article_id", ids);
    if (error) {
      console.error("story engagement read failed", { code: error.code });
      return map;
    }
    for (const row of (data ?? []) as { article_id: string; view_count: number | string | null; comment_count: number | string | null; read_minutes: number | string | null }[]) {
      if (row.view_count == null || row.comment_count == null || row.read_minutes == null) continue;
      const views = Number(row.view_count), comments = Number(row.comment_count), readMinutes = Number(row.read_minutes);
      if (![views, comments, readMinutes].every(Number.isSafeInteger) || views < 0 || comments < 0 || readMinutes < 1) continue;
      map.set(row.article_id, { views, comments, readMinutes });
    }
  } catch {
    // Story content stays available when the numbers cannot be loaded.
  }
  return map;
}
