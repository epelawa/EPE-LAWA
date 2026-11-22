"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminHref } from "../../../lib/admin-path";
import { createStaffClient } from "../../../lib/supabase";

export async function moderateBusinessReview(formData: FormData): Promise<void> {
  const db = await createStaffClient();
  const id = String(formData.get("review_id") ?? "").trim();
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["approve", "hide"].includes(decision) || reason.length < 5 || reason.length > 1000) {
    redirect(adminHref("/business-review?review=invalid"));
  }
  const capability = await db.rpc("has_capability", { p_capability: "business.review" });
  if (capability.error || capability.data !== true) redirect(adminHref("/business-review?review=denied"));
  const { error } = await db.rpc("business_review_moderate", { p_review_id: id, p_decision: decision, p_reason: reason });
  if (error) {
    console.error("business review moderation failed", { code: error.code });
    redirect(adminHref("/business-review?review=failed"));
  }
  revalidatePath(adminHref("/business-review"));
  revalidatePath("/business-directory");
  redirect(adminHref("/business-review?review=updated"));
}
