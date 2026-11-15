import type { SupabaseClient } from "@supabase/supabase-js";

/** Staff RLS can expose drafts, so a public read must pin the publication pointer. */
export async function readPublishedArticleBody(client: SupabaseClient, articleId: string) {
  const { data: publication, error } = await client
    .from("articles")
    .select("published_version_id")
    .eq("id", articleId)
    .maybeSingle();
  if (error || typeof publication?.published_version_id !== "string") {
    return { data: null, error };
  }
  return client
    .from("article_versions")
    .select("body")
    .eq("article_id", articleId)
    .eq("id", publication.published_version_id)
    .maybeSingle();
}
