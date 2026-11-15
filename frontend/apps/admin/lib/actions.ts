"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "./supabase";
import { adminHref } from "./admin-path";
import { isNewsCoverKey } from "../../main/lib/news-covers";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ArticleFields = {
  articleId: string;
  revision: number;
  title: string;
  summary: string | null;
  body: Record<string, unknown>;
  authorId: string;
  categoryId: string;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageKey: string | null;
};

function text(formData: FormData, name: string, max: number): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function articleBody(value: string): Record<string, unknown> | null {
  const source = value.trim();
  if (!source) return null;

  try {
    const parsed: unknown = JSON.parse(source);
    if (
      parsed && typeof parsed === "object" && !Array.isArray(parsed) &&
      (parsed as { type?: unknown }).type === "doc" &&
      Array.isArray((parsed as { content?: unknown }).content)
    ) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // The editor accepts plain text too; render it as safe paragraph nodes below.
  }

  const paragraphs = source
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => ({ type: "paragraph", content: [{ type: "text", text: paragraph }] }));
  return { type: "doc", content: paragraphs };
}

function articleFields(formData: FormData): ArticleFields | null {
  const articleId = text(formData, "articleId", 64);
  const revision = Number(text(formData, "revision", 24));
  const title = text(formData, "title", 200);
  const body = articleBody(text(formData, "body", 100_000));
  const authorId = text(formData, "authorId", 64);
  const categoryId = text(formData, "categoryId", 64);
  const rawCover = text(formData, "ogImageKey", 64);
  if (rawCover && !isNewsCoverKey(rawCover)) return null;
  if (
    !UUID.test(articleId) || !Number.isSafeInteger(revision) || revision < 1 ||
    !title || !body || !UUID.test(authorId) || !UUID.test(categoryId)
  ) return null;

  return {
    articleId,
    revision,
    title,
    summary: text(formData, "summary", 1000) || null,
    body,
    authorId,
    categoryId,
    seoTitle: text(formData, "seoTitle", 70) || null,
    seoDescription: text(formData, "seoDescription", 200) || null,
    ogImageKey: rawCover || null,
  };
}

function queryErrorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return "unavailable";
}

function fail(path: string): never {
  redirect(adminHref(path));
}

export async function createArticle(formData: FormData): Promise<void> {
  const title = text(formData, "title", 200);
  const summary = text(formData, "summary", 1000) || null;
  const body = articleBody(text(formData, "body", 100_000));
  const authorId = text(formData, "authorId", 64);
  const categoryId = text(formData, "categoryId", 64);
  const seoTitle = text(formData, "seoTitle", 70) || null;
  const seoDescription = text(formData, "seoDescription", 200) || null;
  const rawCover = text(formData, "ogImageKey", 64);
  if (rawCover && !isNewsCoverKey(rawCover)) fail("/newsroom/new?error=invalid");
  const ogImageKey = rawCover || null;

  if (!title || !body || !UUID.test(authorId) || !UUID.test(categoryId)) {
    fail("/newsroom/new?error=invalid");
  }

  let articleId: string | null = null;
  try {
    const supabase = await createClient();
    const result = await supabase.rpc("article_create", {
      p_title: title,
      p_summary: summary,
      p_body: body,
      p_author_id: authorId,
      p_category_id: categoryId,
      p_seo_title: seoTitle,
      p_seo_description: seoDescription,
      p_og_image_key: ogImageKey,
    });
    if (result.error) {
      console.error("article creation failed", { code: result.error.code });
    } else if (typeof result.data === "string" && UUID.test(result.data)) {
      articleId = result.data;
    }
  } catch (error) {
    console.error("article creation failed", { code: queryErrorCode(error) });
  }

  if (!articleId) fail("/newsroom/new?error=1");
  revalidatePath(adminHref("/newsroom"));
  redirect(adminHref(`/newsroom/${articleId}?created=1`));
}

export async function saveDraft(formData: FormData): Promise<void> {
  const fields = articleFields(formData);
  if (!fields) fail("/newsroom?error=invalid");

  let errorCode: string | null = null;
  try {
    const supabase = await createClient();
    const saved = await supabase.rpc("article_draft_update", {
      p_article_id: fields.articleId,
      p_expected_revision: fields.revision,
      p_title: fields.title,
      p_summary: fields.summary,
      p_body: fields.body,
      p_author_id: fields.authorId,
      p_category_id: fields.categoryId,
      p_seo_title: fields.seoTitle,
      p_seo_description: fields.seoDescription,
      p_og_image_key: fields.ogImageKey,
    });
    if (saved.error || typeof saved.data !== "number") {
      errorCode = saved.error?.code ?? "save_failed";
    }
  } catch (error) {
    errorCode = queryErrorCode(error);
  }
  if (errorCode) {
    console.error("article draft save failed", { code: errorCode });
    fail(`/newsroom/${fields.articleId}?error=save`);
  }
  revalidatePath(adminHref(`/newsroom/${fields.articleId}`));
  revalidatePath(adminHref("/newsroom"));
  redirect(adminHref(`/newsroom/${fields.articleId}?saved=1`));
}

export async function reviseArticle(formData: FormData): Promise<void> {
  const fields = articleFields(formData);
  if (!fields) fail("/newsroom?error=invalid");

  let errorCode: string | null = null;
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("article_revise", {
      p_article_id: fields.articleId,
      p_expected_revision: fields.revision,
      p_title: fields.title,
      p_summary: fields.summary,
      p_body: fields.body,
      p_author_id: fields.authorId,
      p_category_id: fields.categoryId,
      p_seo_title: fields.seoTitle,
      p_seo_description: fields.seoDescription,
      p_og_image_key: fields.ogImageKey,
    });
    if (error) errorCode = error.code;
  } catch (error) {
    errorCode = queryErrorCode(error);
  }
  if (errorCode) {
    console.error("article revision failed", { code: errorCode });
    fail(`/newsroom/${fields.articleId}?error=revise`);
  }
  revalidatePath(adminHref(`/newsroom/${fields.articleId}`));
  revalidatePath(adminHref("/newsroom"));
  redirect(adminHref(`/newsroom/${fields.articleId}?revised=1`));
}

export async function publishArticle(formData: FormData): Promise<void> {
  await articleTransition(formData, "article_publish", "published");
}

export async function unpublishArticle(formData: FormData): Promise<void> {
  await articleTransition(formData, "article_unpublish", "unpublished");
}

async function articleTransition(
  formData: FormData,
  rpcName: "article_publish" | "article_unpublish",
  outcome: "published" | "unpublished",
): Promise<void> {
  const articleId = text(formData, "articleId", 64);
  const revision = Number(text(formData, "revision", 24));
  if (!UUID.test(articleId) || !Number.isSafeInteger(revision) || revision < 1) fail("/newsroom?error=invalid");

  let errorCode: string | null = null;
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc(rpcName, {
      p_article_id: articleId,
      p_expected_revision: revision,
    });
    if (error) errorCode = error.code;
  } catch (error) {
    errorCode = queryErrorCode(error);
  }
  if (errorCode) {
    console.error(`article ${outcome} transition failed`, { code: errorCode });
    fail(`/newsroom/${articleId}?error=${outcome}`);
  }
  revalidatePath(adminHref(`/newsroom/${articleId}`));
  revalidatePath(adminHref("/newsroom"));
  revalidatePath("/news");
  revalidatePath("/");
  redirect(adminHref(`/newsroom/${articleId}?${outcome}=1`));
}
