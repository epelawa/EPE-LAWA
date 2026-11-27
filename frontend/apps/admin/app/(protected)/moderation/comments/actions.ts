"use server";

import { revalidatePath } from "next/cache";
import { adminRedirect as redirect } from "../../../../lib/admin-redirect";
import { adminHref } from "../../../../lib/admin-path";
import { createStaffClient } from "../../../../lib/supabase";

const UUID_RE = /^[0-9a-f-]{36}$/i;

async function commentOutcome(
  rpc: string,
  p_comment_id: string,
  p_body: string | null,
  p_reason: string | null,
): Promise<string> {
  const supabase = await createStaffClient();
  const payload = p_body !== null ? { p_comment_id, p_body } : { p_comment_id, p_reason };
  const { error } = await supabase.rpc(rpc, payload);
  revalidatePath(adminHref("/moderation/comments"));
  return error ? "failed" : rpc === "comment_staff_update" ? "edited" : "removed";
}

export async function editComment(formData: FormData) {
  const commentId = formData.get("commentId");
  const bodyRaw = formData.get("body");
  const id = typeof commentId === "string" && UUID_RE.test(commentId) ? commentId : null;
  const body = typeof bodyRaw === "string" ? bodyRaw.trim() : "";
  if (!id || body.length < 1 || body.length > 4000) return await redirect(adminHref("/moderation/comments?result=failed"));
  const outcome = await commentOutcome("comment_staff_update", id, body, null);
  return await redirect(adminHref(`/moderation/comments?result=${outcome}`));
}

export async function deleteComment(formData: FormData) {
  const commentId = formData.get("commentId");
  const reasonRaw = formData.get("reason");
  const id = typeof commentId === "string" && UUID_RE.test(commentId) ? commentId : null;
  const reason = typeof reasonRaw === "string" ? reasonRaw.trim() : "";
  if (!id || reason.length < 5 || reason.length > 1000) return await redirect(adminHref("/moderation/comments?result=failed"));
  const outcome = await commentOutcome("comment_staff_delete", id, null, reason);
  return await redirect(adminHref(`/moderation/comments?result=${outcome}`));
}
