"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { formAdminClient, formRateAllowance, formRateMessage } from "../../lib/form-server";
import { humanCheckFailedMessage, verifyHumanCheck } from "../../lib/human-check";
import { ensureGuestKey, memberVoterKey } from "../../lib/guest-identity";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Guests must not pose as the newsroom, staff or the AI assistant. */
function reservedGuestName(name: string): boolean {
  const folded = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ");
  return /\b(epe ?lawa|editorial|editor|admin|administrator|moderator|staff|official|newsroom|ai assistant)\b/.test(folded);
}

export type GuestCommentState = { status: "idle" | "success" | "error"; message: string };
export type LikeState = { liked: boolean; count: number };

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Comment without an account. Order matters (Strix lessons): validate first,
 * then prove a human, then spend the network allowance, then write through the
 * service-role RPC (RLS keeps direct inserts members-only).
 */
export async function postGuestComment(_previous: GuestCommentState, form: FormData): Promise<GuestCommentState> {
  const slug = text(form, "slug");
  const articleId = text(form, "article_id");
  const parentId = text(form, "parent_id");
  const body = text(form, "body");
  const name = text(form, "guest_name");
  if (!slug || !uuid.test(articleId) || (parentId && !uuid.test(parentId))) return { status: "error", message: "This story could not be identified. Refresh and try again." };
  if (body.length < 2 || body.length > 2000) return { status: "error", message: "Write between 2 and 2,000 characters." };
  if (name && (name.length < 2 || name.length > 60)) return { status: "error", message: "Use 2 to 60 characters for your name, or leave it empty." };
  if (name && reservedGuestName(name)) return { status: "error", message: "That name is reserved for the newsroom. Choose another, or leave it empty." };
  if (/https?:\/\/|www\.[a-z0-9-]+\./i.test(body)) return { status: "error", message: "Links are not allowed in guest comments. Sign in to share links." };
  if ((await verifyHumanCheck(form)) === "fail") return { status: "error", message: humanCheckFailedMessage };
  if (!(await formRateAllowance("guest_comment", 6))) return { status: "error", message: await formRateMessage() };
  const guestKey = await ensureGuestKey();
  if (!guestKey) return { status: "error", message: "Guest comments are temporarily unavailable. Please try again later." };
  try {
    const { error } = await formAdminClient().rpc("comment_post_guest", { p_article_id: articleId, p_parent_id: parentId || null, p_body: body, p_name: name || null, p_guest_key: guestKey });
    if (error) {
      console.error("guest comment failed", { code: error.code });
      return { status: "error", message: error.message === "comment_thread_depth" ? "Reply to the main comment instead." : "Your comment could not be posted. Please try again." };
    }
  } catch {
    return { status: "error", message: "Guest comments are temporarily unavailable. Please try again later." };
  }
  revalidatePath(`/news/${slug}`);
  return { status: "success", message: "Thanks — your comment is live. You can delete it from this browser." };
}

export async function deleteGuestComment(form: FormData): Promise<void> {
  const slug = text(form, "slug");
  const commentId = text(form, "comment_id");
  let state = "invalid-delete";
  if (slug && uuid.test(commentId)) {
    const guestKey = await ensureGuestKey();
    const { error } = guestKey ? await formAdminClient().rpc("comment_delete_guest", { p_comment_id: commentId, p_guest_key: guestKey }) : { error: { code: "42501" } };
    state = error ? "delete-denied" : "deleted";
    if (!error) revalidatePath(`/news/${slug}`);
  }
  redirect(`/news/${encodeURIComponent(slug)}?comments=${state}#comments`);
}

/** Signed-in members like as themselves; signed-out readers as their browser. Counted once per reader. */
async function voterKey(): Promise<string | null> {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  return user ? memberVoterKey(user.id) : ensureGuestKey();
}

export async function toggleArticleLike(articleId: string): Promise<LikeState | null> {
  if (!uuid.test(articleId)) return null;
  if (!(await formRateAllowance("engagement_like", 100))) return null;
  const key = await voterKey();
  if (!key) return null;
  try {
    const db = formAdminClient();
    const { data, error } = await db.rpc("article_like_toggle", { p_article_id: articleId, p_voter_key: key });
    if (error || typeof data !== "boolean") return null;
    const total = await db.rpc("article_like_total", { p_article_id: articleId });
    return { liked: data, count: Number(total.data ?? 0) };
  } catch {
    return null;
  }
}

export async function toggleCommentLike(commentId: string): Promise<{ voted: boolean; count: number } | null> {
  if (!uuid.test(commentId)) return null;
  if (!(await formRateAllowance("engagement_like", 100))) return null;
  try {
    const member = await createClient();
    const { data: { user } } = await member.auth.getUser();
    let voted: boolean;
    if (user) {
      const { data, error } = await member.rpc("comment_vote_toggle", { p_comment_id: commentId });
      if (error || typeof data !== "boolean") return null;
      voted = data;
    } else {
      const key = await ensureGuestKey();
      if (!key) return null;
      const { data, error } = await formAdminClient().rpc("comment_guest_vote_toggle", { p_comment_id: commentId, p_voter_key: key });
      if (error || typeof data !== "boolean") return null;
      voted = data;
    }
    const { data: totals } = await formAdminClient().rpc("comment_vote_totals", { p_comment_ids: [commentId] });
    const count = Number((totals as { total: number }[] | null)?.[0]?.total ?? 0);
    return { voted, count };
  } catch {
    return null;
  }
}
