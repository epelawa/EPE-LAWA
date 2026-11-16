"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase";

function text(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Saves or unsaves one published story for the signed-in member.
 * Ownership is enforced twice: the action scopes every write to the caller and
 * the `saved_articles` policies reject any row that is not the caller's.
 */
export async function toggleSavedArticle(data: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  const articleId = text(data, "articleId");
  const slug = text(data, "slug");
  const next = `/news/${encodeURIComponent(slug || "")}`;
  if (error || !user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!UUID_PATTERN.test(articleId)) {
    redirect(slug ? next : "/dashboard?tab=discover");
  }
  if (text(data, "intent") === "save") {
    const { error: insertError } = await supabase
      .from("saved_articles")
      .upsert({ user_id: user.id, article_id: articleId }, { onConflict: "user_id,article_id", ignoreDuplicates: true });
    if (insertError && insertError.code !== "23505") {
      console.error("saved_articles insert failed", { code: insertError.code });
    }
  } else {
    const { error: deleteError } = await supabase
      .from("saved_articles")
      .delete()
      .eq("user_id", user.id)
      .eq("article_id", articleId);
    if (deleteError) console.error("saved_articles delete failed", { code: deleteError.code });
  }
  revalidatePath("/dashboard");
  if (slug) revalidatePath(`/news/${slug}`);
  redirect(slug ? next : "/dashboard?tab=saved");
}
