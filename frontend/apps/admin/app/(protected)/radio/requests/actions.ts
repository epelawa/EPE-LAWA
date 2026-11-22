"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminHref } from "../../../../lib/admin-path";
import { createStaffClient } from "../../../../lib/supabase";

const UUID = /^[0-9a-f-]{36}$/i;

export async function decideSongRequest(formData: FormData): Promise<void> {
  const db = await createStaffClient();
  const requestId = String(formData.get("request_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!UUID.test(requestId) || !["queued", "played", "declined"].includes(status)) {
    redirect(adminHref("/radio/requests?error=invalid"));
  }
  const { error } = await db.rpc("staff_song_request_decide", { p_request_id: requestId, p_status: status });
  if (error) redirect(adminHref("/radio/requests?error=action"));
  revalidatePath(adminHref("/radio/requests"));
  redirect(adminHref("/radio/requests?decided=1"));
}
