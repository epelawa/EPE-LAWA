"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminHref } from "../../../lib/admin-path";
import { createStaffClient } from "../../../lib/supabase";
export async function broadcast(form: FormData) {
 const db = await createStaffClient();
 const title=String(form.get("title") ?? "").trim(), body=String(form.get("body") ?? "").trim();
 if (!title || title.length>140 || !body || body.length>1000 || form.get("confirm")!=="yes") throw new Error("Enter a message and confirm the audience.");
 const {error}=await db.rpc("admin_member_message",{p_user_id:null,p_title:title,p_body:body});
 if(error) throw new Error("Broadcast failed; no messages were sent. Check database availability and the 10,000 recipient limit.");
 revalidatePath("/admin/broadcast"); revalidatePath("/broadcast");
 redirect(adminHref("/broadcast?status=sent"));
}
