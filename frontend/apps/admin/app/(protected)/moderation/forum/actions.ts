"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminHref } from "../../../../lib/admin-path";
import { createClient } from "../../../../lib/supabase";

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
  try {
    const supabase = await createClient();
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
