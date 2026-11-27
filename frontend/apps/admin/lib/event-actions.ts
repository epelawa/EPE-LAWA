"use server";

import { revalidatePath } from "next/cache";
import { adminRedirect as redirect } from "./admin-redirect";
import { adminHref } from "./admin-path";
import { createStaffClient } from "./supabase";

/**
 * Publish or reject a community event submission. staff_event_decide checks
 * events.review (or article.publish) server-side and requires a note when
 * rejecting; this action only validates shape and reports the outcome.
 */
export async function decideEvent(data: FormData) {
  const id = String(data.get("event_id") ?? "").trim();
  const decision = String(data.get("decision") ?? "").trim();
  const note = String(data.get("note") ?? "").trim().slice(0, 1000);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["published", "rejected"].includes(decision)) {
    return await redirect(adminHref("/events?result=invalid"));
  }
  if (decision === "rejected" && note.length < 2) return await redirect(adminHref("/events?result=note"));

  let failed = false;
  try {
    const supabase = await createStaffClient();
    const result = await supabase.rpc("staff_event_decide", { p_event_id: id, p_status: decision, p_note: note || null });
    failed = Boolean(result.error);
    if (result.error) console.error("event review action failed", { code: result.error.code });
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    failed = true;
    console.error("event review unavailable");
  }
  revalidatePath(adminHref("/events"));
  revalidatePath("/events");
  return await redirect(adminHref(`/events?result=${failed ? "stale" : "saved"}`));
}
