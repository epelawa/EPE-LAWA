"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminHref } from "../../../../lib/admin-path";
import { createStaffClient } from "../../../../lib/supabase";

const allowed = new Set(["hide", "restore", "dismiss"]);
export async function resolveForumReport(formData: FormData) {
  const reportId = formData.get("reportId");
  const action = formData.get("action");
  const reason = formData.get("resolutionReason");
  if (typeof reportId !== "string" || !/^[0-9a-f-]{36}$/i.test(reportId) ||
      typeof action !== "string" || !allowed.has(action) ||
      typeof reason !== "string" || reason.trim().length < 5 || reason.trim().length > 1000) {
    return;
  }

  let saved = false;
  const supabase = await createStaffClient();
  try {
    const { error } = await supabase.rpc("forum_report_resolve", {
      p_report_id: reportId,
      p_action: action,
      p_reason: reason.trim(),
    });
    saved = !error;
  } catch {
    saved = false;
  }

  if (saved) revalidatePath(adminHref("/moderation/forum"));
  const result = saved ? "saved" : "failed";
  redirect(adminHref(`/moderation/forum?result=${result}`));
}

const UUID_RE = /^[0-9a-f-]{36}$/i;

async function callForumRpc(name: string, idField: string, formData: FormData, result: string) {
  const id = formData.get(idField);
  const rawReason = formData.get("reason");
  const idOk = typeof id === "string" && UUID_RE.test(id);
  const reason = typeof rawReason === "string" ? rawReason.trim() : "";
  if (!idOk || reason.length < 5 || reason.length > 1000) return "delete-failed";
  const supabase = await createStaffClient();
  const { error } = await supabase.rpc(name, idField === "threadId"
    ? { p_thread_id: id as string, p_reason: reason }
    : { p_post_id: id as string, p_reason: reason });
  if (error) return "delete-failed";
  revalidatePath(adminHref("/moderation/forum"));
  return result;
}

export async function deleteForumThread(formData: FormData) {
  redirect(adminHref(`/moderation/forum?result=${await callForumRpc("forum_staff_thread_delete", "threadId", formData, "removed")}`));
}

export async function deleteForumPost(formData: FormData) {
  redirect(adminHref(`/moderation/forum?result=${await callForumRpc("forum_staff_post_delete", "postId", formData, "removed")}`));
}

export async function restoreForumPost(formData: FormData) {
  redirect(adminHref(`/moderation/forum?result=${await callForumRpc("forum_staff_post_restore", "postId", formData, "restored")}`));
}
