"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminHref } from "../../../lib/admin-path";
import { createClient } from "../../../lib/supabase";

const value = (form: FormData, key: string) => {
  const raw = form.get(key);
  return typeof raw === "string" ? raw.trim() : "";
};

export async function reviewBusiness(formData: FormData): Promise<void> {
  const db = await createClient();
  const id = value(formData, "business_id");
  const status = value(formData, "status");
  const note = value(formData, "note");
  const evidence = value(formData, "evidence");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["reviewing", "published", "rejected"].includes(status) || note.length < 5 || note.length > 1000 || (status === "published" && (evidence.length < 10 || evidence.length > 2000))) {
    redirect(adminHref("/business-review?error=invalid"));
  }
  if (status === "published") {
    const { error } = await db.rpc("business_verify", { p_business_id: id, p_note: evidence });
    if (error) redirect(adminHref("/business-review?error=verification-failed"));
  }
  const { error } = await db.rpc("business_set_status", { p_business_id: id, p_status: status, p_note: note });
  if (error) redirect(adminHref("/business-review?error=action-failed"));
  revalidatePath(adminHref("/business-review"));
  revalidatePath("/business-directory");
  redirect(adminHref("/business-review?updated=1"));
}
