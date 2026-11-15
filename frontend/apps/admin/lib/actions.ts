"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "./supabase";
import { adminHref } from "./admin-path";
import { isNewsCoverKey } from "../../main/lib/news-covers";
import { normalizeExternalNewsAttributionUrl, normalizeExternalNewsCoverUrl } from "../../main/lib/news-cover-url.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CoverFields = {
  coverUrl: string | null;
  coverAlt: string | null;
  coverCredit: string | null;
  coverSourceUrl: string | null;
  coverLicenseUrl: string | null;
  coverCaption: string | null;
};
type ArticleFields = CoverFields & {
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

function rawText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}
function text(formData: FormData, name: string, max: number): string {
  return rawText(formData, name).slice(0, max);
}
function nullCoverFields(): CoverFields {
  return { coverUrl: null, coverAlt: null, coverCredit: null, coverSourceUrl: null, coverLicenseUrl: null, coverCaption: null };
}
function coverFields(formData: FormData, rawCoverKey: string): CoverFields | null {
  const rawUrl = rawText(formData, "coverUrl");
  if (rawUrl.length > 2048) return null;
  // Selecting a catalog cover, or explicitly clearing the cover URL, clears remote metadata.
  if (rawCoverKey) return rawUrl ? null : nullCoverFields();
  if (!rawUrl) return nullCoverFields();

  const url = normalizeExternalNewsCoverUrl(rawUrl);
  const rawAlt = rawText(formData, "coverAlt");
  const rawCredit = rawText(formData, "coverCredit");
  const rawSource = rawText(formData, "coverSourceUrl");
  const rawLicense = rawText(formData, "coverLicenseUrl");
  const rawCaption = rawText(formData, "coverCaption");
  if (
    !url || rawAlt.length < 1 || rawAlt.length > 500 || rawCredit.length < 1 || rawCredit.length > 300 ||
    rawSource.length > 2048 || rawLicense.length > 2048 || rawCaption.length > 500
  ) return null;
  const sourceUrl = normalizeExternalNewsAttributionUrl(rawSource);
  const licenseUrl = normalizeExternalNewsAttributionUrl(rawLicense);
  if (!sourceUrl || !licenseUrl) return null;
  return {
    coverUrl: url,
    coverAlt: rawAlt,
    coverCredit: rawCredit,
    coverSourceUrl: sourceUrl,
    coverLicenseUrl: licenseUrl,
    coverCaption: rawCaption || null,
  };
}
function invalidCover(formData: FormData): boolean {
  const rawCoverKey = rawText(formData, "ogImageKey");
  if (rawCoverKey && !isNewsCoverKey(rawCoverKey)) return true;
  return coverFields(formData, rawCoverKey) === null;
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
    ) return parsed as Record<string, unknown>;
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
  const cover = coverFields(formData, rawCover);
  if (!cover) return null;
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
    ...cover,
  };
}
function coverRpcFields(fields: CoverFields) {
  return {
    p_cover_url: fields.coverUrl,
    p_cover_alt: fields.coverAlt,
    p_cover_credit: fields.coverCredit,
    p_cover_source_url: fields.coverSourceUrl,
    p_cover_license_url: fields.coverLicenseUrl,
    p_cover_caption: fields.coverCaption,
  };
}
function queryErrorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") return error.code;
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
  const cover = coverFields(formData, rawCover);
  if (!cover) fail("/newsroom/new?error=cover");
  const ogImageKey = rawCover || null;
  if (!title || !body || !UUID.test(authorId) || !UUID.test(categoryId)) fail("/newsroom/new?error=invalid");

  let articleId: string | null = null;
  let errorCode: string | null = null;
  try {
    const supabase = await createClient();
    const result = await supabase.rpc("article_create_with_cover", {
      p_title: title,
      p_summary: summary,
      p_body: body,
      p_author_id: authorId,
      p_category_id: categoryId,
      p_seo_title: seoTitle,
      p_seo_description: seoDescription,
      p_og_image_key: ogImageKey,
      ...coverRpcFields(cover),
    });
    if (result.error) errorCode = result.error.code;
    else if (typeof result.data === "string" && UUID.test(result.data)) articleId = result.data;
  } catch (error) {
    errorCode = queryErrorCode(error);
  }
  if (!articleId) fail(errorCode === "22023" ? "/newsroom/new?error=cover" : "/newsroom/new?error=1");
  revalidatePath(adminHref("/newsroom"));
  redirect(adminHref(`/newsroom/${articleId}?created=1`));
}

export async function saveDraft(formData: FormData): Promise<void> {
  const requestedArticleId = text(formData, "articleId", 64);
  if (invalidCover(formData)) fail(`/newsroom/${requestedArticleId}?error=cover`);
  const fields = articleFields(formData);
  if (!fields) fail("/newsroom?error=invalid");

  let errorCode: string | null = null;
  try {
    const supabase = await createClient();
    const saved = await supabase.rpc("article_draft_update_with_cover", {
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
      ...coverRpcFields(fields),
    });
    if (saved.error || typeof saved.data !== "number") errorCode = saved.error?.code ?? "save_failed";
  } catch (error) {
    errorCode = queryErrorCode(error);
  }
  if (errorCode) {
    console.error("article draft save failed", { code: errorCode });
    fail(`/newsroom/${fields.articleId}?error=${errorCode === "22023" ? "cover" : "save"}`);
  }
  revalidatePath(adminHref(`/newsroom/${fields.articleId}`));
  revalidatePath(adminHref("/newsroom"));
  redirect(adminHref(`/newsroom/${fields.articleId}?saved=1`));
}

export async function reviseArticle(formData: FormData): Promise<void> {
  const requestedArticleId = text(formData, "articleId", 64);
  if (invalidCover(formData)) fail(`/newsroom/${requestedArticleId}?error=cover`);
  const fields = articleFields(formData);
  if (!fields) fail("/newsroom?error=invalid");

  let errorCode: string | null = null;
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("article_revise_with_cover", {
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
      ...coverRpcFields(fields),
    });
    if (error) errorCode = error.code;
  } catch (error) {
    errorCode = queryErrorCode(error);
  }
  if (errorCode) {
    console.error("article revision failed", { code: errorCode });
    fail(`/newsroom/${fields.articleId}?error=${errorCode === "22023" ? "cover" : "revise"}`);
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
    const { error } = await supabase.rpc(rpcName, { p_article_id: articleId, p_expected_revision: revision });
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
