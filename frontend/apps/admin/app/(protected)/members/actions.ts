"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminHref } from "../../../lib/admin-path";
import { createClient } from "../../../lib/supabase";

export async function messageMember(form: FormData) {
  const db = await createClient();
  const id = String(form.get("user_id") ?? "");
  const title = String(form.get("title") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id) || !title || title.length > 140 || !body || body.length > 1000) throw new Error("Invalid message.");
  const { error } = await db.rpc("admin_member_message", { p_user_id: id, p_title: title, p_body: body });
  if (error) throw new Error("Message could not be sent. Check that the member is verified and the database migration is available.");
  revalidatePath("/admin/members"); revalidatePath("/members");
  redirect(adminHref("/members?status=sent"));
}
export async function deleteMember(form: FormData) {
  const db = await createClient();
  const id = String(form.get("user_id") ?? "");
  const email = String(form.get("confirm_email") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id) || !email) throw new Error("Enter the member email to confirm deletion.");
  const { error } = await db.rpc("admin_member_delete", { p_user_id: id, p_confirm_email: email });
  if (error) throw new Error("Deletion failed. Confirm the email; retained records may prevent deletion.");
  revalidatePath("/admin/members"); revalidatePath("/members");
  redirect(adminHref("/members?status=deleted"));
}
