"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminHref } from "../../../lib/admin-path";
import { createStaffClient } from "../../../lib/supabase";

const UUID = /^[0-9a-f-]{36}$/i;

export async function decideEvent(formData: FormData): Promise<void> {
  const db = await createStaffClient();
  const eventId = String(formData.get("event_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!UUID.test(eventId) || !["published", "rejected"].includes(status) || (status === "rejected" && note.length < 2) || note.length > 1000) {
    redirect(adminHref("/events?error=invalid"));
  }
  const { error } = await db.rpc("staff_event_decide", { p_event_id: eventId, p_status: status, p_note: note });
  if (error) redirect(adminHref("/events?error=action"));
  revalidatePath(adminHref("/events"));
  revalidatePath("/events");
  redirect(adminHref("/events?decided=1"));
}
