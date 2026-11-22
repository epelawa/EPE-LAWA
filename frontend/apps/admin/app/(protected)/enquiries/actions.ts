"use server";
import { redirect } from "next/navigation";
import { createStaffClient } from "../../../lib/supabase";
import { adminHref } from "../../../lib/admin-path";
export async function resolveEnquiry(form: FormData) {
  const id = form.get("id"), revision = form.get("revision");
  let result = "failed";
  if (typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id) && typeof revision === "string" && /^[1-9][0-9]{0,14}$/.test(revision)) {
    const db = await createStaffClient();
    const response = await db.rpc("staff_enquiry_resolve", {p_id:id,p_expected_revision:Number(revision)});
    if (!response.error) result="saved";
  }
  redirect(`${adminHref("/enquiries")}?result=${result}`);
}
