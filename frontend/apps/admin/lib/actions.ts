"use server";

import { createClient } from "../lib/supabase";

export async function createArticle(formData: FormData): Promise<void> {
  const supabase = await createClient();
  try {
  const title = formData.get("title") as string;
  const summary = formData.get("summary") as string;
  const body = formData.get("body") as string;
  const categoryId = formData.get("categoryId") as string || null;
  const authorId = formData.get("authorId") as string || null;

  let bodyJson = {};
  try {
    bodyJson = JSON.parse(body || "{}");
  } catch {
    bodyJson = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: body }] }] };
  }

  const { data, error } = await supabase.rpc("article_create", {
    p_title: title,
    p_summary: summary || null,
    p_body: bodyJson,
    p_author_id: authorId,
    p_category_id: categoryId,
    p_seo_title: null,
    p_seo_description: null,
    p_og_image_key: null,
  });

  if (error) {
    console.error("Article creation failed:", error.message);
    return;
  }
} catch (err) {
  console.error("Article creation failed:", err);
}
}

export async function submitArticle(articleId: string, revision: number): Promise<void> {
  const supabase = await createClient();
  try {
  const { error } = await supabase.rpc("article_submit", {
    p_article_id: articleId,
    p_expected_revision: revision,
  });

  if (error) {
    console.error("Article submission failed:", error.message);
    return;
  }
} catch (err) {
  console.error("Article submission failed:", err);
}
}
