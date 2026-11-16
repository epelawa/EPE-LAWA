"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase";

const value = (form: FormData, key: string) => {
  const raw = form.get(key);
  return typeof raw === "string" ? raw.trim() : "";
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reasons = new Set(["spam", "harassment", "hate", "misinformation", "privacy", "other"]);
function back(slug: string, state: string): never {
  redirect(`/news/${encodeURIComponent(slug)}?comments=${encodeURIComponent(state)}#comments`);
}
async function member(slug: string) {
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) redirect(`/login?next=${encodeURIComponent(`/news/${slug}#comments`)}`);
  if (!user.email_confirmed_at) back(slug, "verify-email");
  return { db, user };
}
export async function postArticleComment(form: FormData) {
  const slug = value(form, "slug");
  const articleId = value(form, "article_id");
  const parentId = value(form, "parent_id");
  const body = value(form, "body");
  if (!slug || !uuid.test(articleId) || (parentId && !uuid.test(parentId)) || body.length < 1 || body.length > 4000) back(slug || "", "invalid");
  const { db, user } = await member(slug);
  const { error } = await db.from("comments").insert({ article_id: articleId, parent_id: parentId || null, author_id: user.id, body });
  if (error) back(slug, error.code === "23505" ? "unavailable" : "unavailable");
  revalidatePath(`/news/${slug}`);
  back(slug, "submitted");
}
export async function deleteArticleComment(form: FormData) {
  const slug = value(form, "slug");
  const commentId = value(form, "comment_id");
  if (!slug || !uuid.test(commentId)) back(slug || "", "invalid-delete");
  const { db } = await member(slug);
  // `comment_delete` is the audited, author-only RPC: it blanks the body and
  // leaves a tombstone so replies remain readable.
  const { error } = await db.rpc("comment_delete", { p_comment_id: commentId });
  if (error) back(slug, error.code === "42501" ? "delete-denied" : "delete-unavailable");
  revalidatePath(`/news/${slug}`);
  back(slug, "deleted");
}

export async function reportArticleComment(form: FormData) {
  const slug = value(form, "slug");
  const commentId = value(form, "comment_id");
  const reason = value(form, "reason");
  const note = value(form, "note");
  if (!slug || !uuid.test(commentId) || !reasons.has(reason) || note.length > 1000) back(slug || "", "invalid-report");
  const { db, user } = await member(slug);
  const { error } = await db.from("comment_reports").insert({ comment_id: commentId, reporter_id: user.id, reason, note: note || null });
  if (error) back(slug, "report-unavailable");
  back(slug, "reported");
}
export async function moderateArticleComment(form: FormData) {
  const slug = value(form, "slug");
  const commentId = value(form, "comment_id");
  const action = value(form, "action");
  const reason = value(form, "reason");
  if (!slug || !uuid.test(commentId) || !["hide", "restore"].includes(action) || reason.length < 5 || reason.length > 1000) back(slug || "", "invalid-moderation");
  const { db } = await member(slug);
  const { error } = await db.rpc("comment_moderate", { p_comment_id: commentId, p_action: action, p_reason: reason });
  if (error) back(slug, "moderation-denied");
  revalidatePath(`/news/${slug}`);
  back(slug, "moderated");
}

export async function resolveArticleCommentReport(form: FormData) {
  const slug = value(form, "slug");
  const reportId = value(form, "report_id");
  const action = value(form, "action");
  const reason = value(form, "reason");
  if (!slug || !uuid.test(reportId) || !["actioned", "dismissed"].includes(action) || reason.length < 5 || reason.length > 1000) back(slug || "", "invalid-moderation");
  const { db } = await member(slug);
  const { error } = await db.rpc("comment_report_resolve", { p_report_id: reportId, p_action: action, p_reason: reason });
  if (error) back(slug, "moderation-denied");
  revalidatePath(`/news/${slug}`);
  back(slug, "moderated");
}
