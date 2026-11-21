"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminHref } from "../../../lib/admin-path";
import { createClient } from "../../../lib/supabase";

const value = (form: FormData, key: string) => {
  const raw = form.get(key);
  return typeof raw === "string" ? raw.trim() : "";
};

export async function resolveCorrection(form: FormData): Promise<void> {
  const db = await createClient();
  const { data: allowed, error: ge } = await db.rpc("has_capability", { p_capability: "article.review" });
  if (ge || allowed !== true) redirect(adminHref("/corrections?error=forbidden"));

  const reportId = value(form, "report_id");
  const status = value(form, "status");
  const note = value(form, "note");
  if (!/^[0-9a-f-]{36}$/i.test(reportId) || !["resolved", "dismissed"].includes(status)
    || reportId.length !== 36
    || (status === "resolved" && (note.length < 2 || note.length > 2000))) {
    redirect(adminHref("/corrections?error=invalid"));
  }
  const { error } = await db.rpc("staff_resolve_correction", { p_report_id: reportId, p_status: status, p_note: note || null });
  if (error) redirect(adminHref("/corrections?error=action-failed"));
  revalidatePath(adminHref("/corrections"));
  redirect(adminHref(`/corrections?${status === "resolved" ? "resolved" : "dismissed"}=1`));
}
