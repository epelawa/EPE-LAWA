"use server";

import { revalidatePath } from "next/cache";
import { adminRedirect as redirect } from "../../../lib/admin-redirect";
import { adminHref } from "../../../lib/admin-path";
import { createStaffClient } from "../../../lib/supabase";

const UUID = /^[0-9a-f-]{36}$/i;

export async function decideAppeal(formData: FormData): Promise<void> {
  const db = await createStaffClient();
  const appealId = String(formData.get("appeal_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!UUID.test(appealId) || !["granted", "denied"].includes(status) || note.length < 2 || note.length > 1000) {
    return await redirect(adminHref("/appeals?error=invalid"));
  }
  const { error } = await db.rpc("staff_decide_appeal", { p_appeal_id: appealId, p_status: status, p_note: note });
  if (error) return await redirect(adminHref("/appeals?error=action"));
  revalidatePath(adminHref("/appeals"));
  return await redirect(adminHref("/appeals?decided=1"));
}
