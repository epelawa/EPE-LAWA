"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "./supabase";
import { adminHref } from "./admin-path";
import { hasConfirmedArticleUnpublish } from "./article-publication-state";
import { publicMediaUrl } from "../../main/lib/media";
import { normalizeExternalNewsCoverUrl } from "../../main/lib/news-cover-url.mjs";
import { mediaExtensionFor, putMediaObject } from "./media-r2";

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
const COVER_UPLOAD_MAX_BYTES = 26_214_400;
const COVER_UPLOAD_ERRORS: Record<string, string> = {
  unconfigured: "Image storage is not configured, so direct uploads are unavailable. Link a public HTTPS image instead.",
  invalid_file: "That file type cannot be used as a cover. Upload a JPEG, PNG, WebP or AVIF image.",
  too_large: "That image is too large. Upload a cover smaller than 26 MB.",
  invalid: "An uploaded cover needs alt text, credit, a safe HTTPS source page and a license URL.",
  storage_failed: "The image could not be stored right now. Check your connection and try again.",
};
function coverUploadFile(formData: FormData): File | null {
  const value = formData.get("coverUpload");
  return value instanceof File && value.size > 0 && value.name.trim() !== "" ? value : null;
}
type UploadedCoverMetadata = { state: "ok"; fields: CoverFields } | { state: "error"; message: string };
function uploadedCoverMetadata(formData: FormData): UploadedCoverMetadata {
  const rawAlt = rawText(formData, "coverAlt");
  const rawCredit = rawText(formData, "coverCredit");
  const rawSource = rawText(formData, "coverSourceUrl");
  const rawLicense = rawText(formData, "coverLicenseUrl");
  const rawCaption = rawText(formData, "coverCaption");
  const sourceUrl = normalizeExternalNewsCoverUrl(rawSource);
  const licenseUrl = normalizeExternalNewsCoverUrl(rawLicense);
  if (
    rawAlt.length < 1 || rawAlt.length > 500 || rawCredit.length < 1 || rawCredit.length > 300 ||
    rawCaption.length > 500 || !sourceUrl || !licenseUrl
  ) return { state: "error", message: COVER_UPLOAD_ERRORS.invalid };
  return { state: "ok", fields: { coverUrl: "", coverAlt: rawAlt, coverCredit: rawCredit, coverSourceUrl: sourceUrl, coverLicenseUrl: licenseUrl, coverCaption: rawCaption || null } };
}
type StoredCover = { fields: CoverFields } | { error: string };
async function storeCoverUpload(formData: FormData, file: File): Promise<StoredCover> {
  const meta = uploadedCoverMetadata(formData);
  if (meta.state === "error") return { error: meta.message };
  if (file.size > COVER_UPLOAD_MAX_BYTES) return { error: COVER_UPLOAD_ERRORS.too_large };
  const extension = mediaExtensionFor(file.type);
  if (!extension) return { error: COVER_UPLOAD_ERRORS.invalid_file };
  const now = new Date();
  const period = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const random = Array.from(crypto.getRandomValues(new Uint8Array(6)), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const stem = file.name.replace(/\.[^.]*$/, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase().slice(0, 60) || "cover";
  const objectKey = `media/covers/${period}/${random}-${stem}${extension}`;
  const publicUrl = publicMediaUrl(objectKey);
  if (!publicUrl) return { error: COVER_UPLOAD_ERRORS.unconfigured };
  const written = await putMediaObject("public", objectKey, await file.arrayBuffer(), file.type);
  if (written.state !== "ready") return { error: COVER_UPLOAD_ERRORS.storage_failed };
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("media_asset_create", {
      p_kind: "cover",
      p_title: stem.replace(/-/g, " ").slice(0, 180),
      p_credit: meta.fields.coverCredit ?? null,
      p_rights_note: meta.fields.coverLicenseUrl,
      p_bucket: "public",
      p_object_key: objectKey,
      p_mime_type: file.type,
      p_byte_size: written.size,
      p_width: null,
      p_height: null,
      p_alt_text: meta.fields.coverAlt ?? null,
    });
    if (error) console.error("media_asset_create failed for uploaded cover", { code: error.code });
  } catch (error) {
    console.error("media_asset_create failed for uploaded cover", { error: queryErrorCode(error) });
  }
  return { fields: { ...meta.fields, coverUrl: publicUrl } };
}
function coverFields(formData: FormData): CoverFields | null {
  const rawUrl = rawText(formData, "coverUrl");
  if (rawUrl.length > 2048) return null;
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
  const sourceUrl = normalizeExternalNewsCoverUrl(rawSource);
  const licenseUrl = normalizeExternalNewsCoverUrl(rawLicense);
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
  const linkedUrl = rawText(formData, "coverUrl");
  const upload = coverUploadFile(formData);
  if (linkedUrl && upload) return true;
  if (upload) return uploadedCoverMetadata(formData).state === "error";
  return coverFields(formData) === null;
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
  const cover = coverFields(formData);
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

async function createArticleCore(formData: FormData): Promise<{ status: "error" | "uncertain"; message: string } | { status: "success"; articleId: string }> {
  const title = text(formData, "title", 200);
  const summary = text(formData, "summary", 1000) || null;
  const body = articleBody(text(formData, "body", 100_000));
  const authorId = text(formData, "authorId", 64);
  const categoryId = text(formData, "categoryId", 64);
  const seoTitle = text(formData, "seoTitle", 70) || null;
  const seoDescription = text(formData, "seoDescription", 200) || null;
  const coverUpload = coverUploadFile(formData);
  if (coverUpload && rawText(formData, "coverUrl")) return { status: "error", message: "Choose only one cover source: a link or an upload, not both." };
  let cover: CoverFields | null = null;
  if (coverUpload) {
    const stored = await storeCoverUpload(formData, coverUpload);
    if ("error" in stored) return { status: "error", message: stored.error };
    cover = stored.fields;
  } else {
    cover = coverFields(formData);
    if (!cover) return { status: "error", message: "To add a cover image, link a safe HTTPS image with alt text, credit, source and license." };
  }
  if (!title || !body || !UUID.test(authorId) || !UUID.test(categoryId)) return { status: "error", message: "Add a headline, article body, author and category." };

  let articleId: string | null = null;
  let errorCode: string | null = null;
  let uncertain = false;
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
      ...coverRpcFields(cover),
    });
    if (result.error) errorCode = result.error.code;
    else if (typeof result.data === "string" && UUID.test(result.data)) articleId = result.data;
    else uncertain = true;
  } catch (error) {
    errorCode = queryErrorCode(error);
    uncertain = true;
  }
  if (!articleId) {
    if (errorCode && !/^(22[0-9A-Z]{3}|23[0-9A-Z]{3}|42501)$/.test(errorCode)) uncertain = true;
    if (uncertain) return { status: "uncertain", message: "We could not confirm whether the article was saved. Check the newsroom list before trying again to avoid a duplicate." };
    return { status: "error", message: errorCode === "22023" ? "Check the cover details and try again." : "The article was not saved. Check your access and try again." };
  }
  revalidatePath(adminHref("/newsroom"));
  return { status: "success", articleId };
}


export async function createArticle(formData: FormData): Promise<void> {
  const result = await createArticleCore(formData);
  if (result.status === "success") redirect(adminHref(`/newsroom/${result.articleId}?created=1`));
  fail(result.status === "uncertain" ? "/newsroom/new?error=uncertain" : "/newsroom/new?error=1");
}
export async function createArticleWithFeedback(formData: FormData): Promise<{ status: "error" | "uncertain"; message: string } | { status: "success"; articleId: string }> {
  return createArticleCore(formData);
}

type EditResult = { status: "error" | "uncertain"; message: string } | { status: "success"; articleId: string; outcome: "saved" | "revised" };
function editFailure(code: string | null, uncertain: boolean): EditResult {
  if (uncertain || !code || !/^(22[0-9A-Z]{3}|23[0-9A-Z]{3}|40001|42501)$/.test(code)) return { status: "uncertain", message: "We could not confirm whether your changes were saved. Open this article in a new tab and check its revision before retrying." };
  if (code === "40001") return { status: "error", message: "This article changed since you opened it. Copy your work, then reload and review the latest revision." };
  return { status: "error", message: code === "22023" ? "Check the cover and article details." : "The changes were not saved. Check your access and the current revision." };
}
async function saveDraftCore(formData: FormData): Promise<EditResult> {
  const requestedArticleId = text(formData, "articleId", 64);
  if (invalidCover(formData)) return { status: "error", message: "Check the cover source, alt text and credit details." };
  const fields = articleFields(formData);
  if (!fields) return { status: "error", message: "Check the headline, body, author and category. Reload if the revision is invalid." };
  const coverUpload = coverUploadFile(formData);
  if (coverUpload) {
    const stored = await storeCoverUpload(formData, coverUpload);
    if ("error" in stored) return { status: "error", message: stored.error };
    Object.assign(fields, stored.fields);
  }

  let errorCode: string | null = null;
  let uncertain = false;
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
      ...coverRpcFields(fields),
    });
    if (saved.error) errorCode = saved.error.code;
    else if (typeof saved.data !== "number") uncertain = true;
  } catch (error) {
    errorCode = queryErrorCode(error);
    uncertain = true;
  }
  if (errorCode || uncertain) {
    console.error("article draft save failed", { code: errorCode });
    return editFailure(errorCode, uncertain);
  }
  revalidatePath(adminHref(`/newsroom/${fields.articleId}`));
  revalidatePath(adminHref("/newsroom"));
  return { status: "success", articleId: fields.articleId, outcome: "saved" };
}

async function reviseArticleCore(formData: FormData): Promise<EditResult> {
  const requestedArticleId = text(formData, "articleId", 64);
  if (invalidCover(formData)) return { status: "error", message: "Check the cover source, alt text and credit details." };
  const fields = articleFields(formData);
  if (!fields) return { status: "error", message: "Check the headline, body, author and category. Reload if the revision is invalid." };
  const revisionUpload = coverUploadFile(formData);
  if (revisionUpload) {
    const stored = await storeCoverUpload(formData, revisionUpload);
    if ("error" in stored) return { status: "error", message: stored.error };
    Object.assign(fields, stored.fields);
  }

  let errorCode: string | null = null;
  let uncertain = false;
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
      ...coverRpcFields(fields),
    });
    if (error) errorCode = error.code;
  } catch (error) {
    errorCode = queryErrorCode(error);
    uncertain = true;
  }
  if (errorCode || uncertain) {
    console.error("article revision failed", { code: errorCode });
    return editFailure(errorCode, uncertain);
  }
  revalidatePath(adminHref(`/newsroom/${fields.articleId}`));
  revalidatePath(adminHref("/newsroom"));
  return { status: "success", articleId: fields.articleId, outcome: "revised" };
}

export async function saveDraftWithFeedback(formData: FormData): Promise<EditResult> { return saveDraftCore(formData); }
export async function reviseArticleWithFeedback(formData: FormData): Promise<EditResult> { return reviseArticleCore(formData); }
export async function saveDraft(formData: FormData): Promise<void> {
  const result = await saveDraftCore(formData);
  if (result.status === "success") redirect(adminHref(`/newsroom/${result.articleId}?saved=1`));
  const id = text(formData, "articleId", 64);
  fail(UUID.test(id) ? `/newsroom/${id}?error=${result.status === "uncertain" ? "uncertain" : "save"}` : "/newsroom?error=invalid");
}
export async function reviseArticle(formData: FormData): Promise<void> {
  const result = await reviseArticleCore(formData);
  if (result.status === "success") redirect(adminHref(`/newsroom/${result.articleId}?revised=1`));
  const id = text(formData, "articleId", 64);
  fail(UUID.test(id) ? `/newsroom/${id}?error=${result.status === "uncertain" ? "uncertain" : "revise"}` : "/newsroom?error=invalid");
}

export async function publishArticle(formData: FormData): Promise<void> {
  await articleTransition(formData, "article_publish", "published");
}
export async function unpublishArticle(formData: FormData): Promise<void> {
  const articleId = text(formData, "articleId", 64);
  if (!UUID.test(articleId)) fail("/newsroom?error=invalid");
  if (!hasConfirmedArticleUnpublish(rawText(formData, "confirmUnpublish"))) {
    fail(`/newsroom/${articleId}?error=unpublish_confirmation`);
  }
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

/** Mark only an already-public story. Expiry is computed server-side from an allowed duration. */
export async function setArticleBreaking(formData: FormData): Promise<void> {
  const articleId = text(formData, "articleId", 64);
  const revision = Number(text(formData, "revision", 24));
  const operation = text(formData, "operation", 16);
  const duration = text(formData, "duration", 8);
  if (!UUID.test(articleId) || !Number.isSafeInteger(revision) || revision < 1) fail("/newsroom?error=invalid");
  if (operation !== "enable" && operation !== "disable") fail(`/newsroom/${articleId}?error=breaking`);
  if (operation === "enable" && !["1", "6", "24", "48"].includes(duration)) fail(`/newsroom/${articleId}?error=breaking`);
  const until = operation === "enable" ? new Date(Date.now() + Number(duration) * 60 * 60 * 1000).toISOString() : null;
  let errorCode: string | null = null;
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("article_set_breaking", {
      p_article_id: articleId, p_expected_revision: revision, p_breaking: operation === "enable", p_until: until,
    });
    if (error) errorCode = error.code;
  } catch (error) { errorCode = queryErrorCode(error); }
  if (errorCode) {
    console.error("article breaking update failed", { code: errorCode });
    fail(`/newsroom/${articleId}?error=breaking`);
  }
  revalidatePath(adminHref(`/newsroom/${articleId}`));
  revalidatePath(adminHref("/newsroom"));
  revalidatePath("/news");
  revalidatePath("/dashboard");
  redirect(adminHref(`/newsroom/${articleId}?breaking=1`));
}
