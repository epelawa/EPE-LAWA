"use server";

import { formAdminClient, formRateAllowance, formRateLimitedMessage } from "../../../lib/form-server";
import { createClient } from "../../../lib/supabase";
import { validateGuestContact } from "../../../lib/public-submitter";
import { authMailConfig, deliverAuthMessage } from "../../../lib/auth-mail-hook";

export type CorrectionState = { status: "idle" | "error" | "success"; message: string; field?: string };
const text = (f: FormData, k: string, max: number) => { const v = f.get(k); return typeof v === "string" ? v.trim().slice(0, max) : ""; };
const fail = (message: string, field?: string): CorrectionState => ({ status: "error", message, field });

/**
 * Ìtàn Ilú Mi correction or removal request. Stored in
 * `history_correction_requests`, which the staff Ìtàn Ilú Mi review page lists
 * in its own "Correction requests" section (not the general enquiries inbox).
 */
export async function submitHistoryCorrection(_prev: CorrectionState, form: FormData): Promise<CorrectionState> {
  if (text(form, "website", 200)) return { status: "success", message: "Your request was sent to the Ìtàn Ilú Mi team." };
  const recordRef = text(form, "record_ref", 300);
  const kind = text(form, "request_kind", 20);
  const message = text(form, "message", 5000);
  let name = text(form, "sender_name", 100);
  let email = text(form, "sender_email", 254).toLowerCase();
  if (recordRef.length < 2) return fail("Name the record (its title, family or community).", "record_ref");
  if (kind !== "correction" && kind !== "removal") return fail("Choose whether you want a correction or a removal.", "request_kind");
  if (message.length < 10) return fail("Explain what should change in at least 10 characters.", "message");

  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user?.email_confirmed_at) {
      userId = data.user.id;
      email = email || (data.user.email ?? "").toLowerCase();
    }
  } catch { userId = null; }
  if (!name && userId) name = email.split("@")[0]?.slice(0, 100) ?? "";
  const problem = validateGuestContact(name, email);
  if (problem) return fail(problem, name.length < 2 ? "sender_name" : "sender_email");

  if (!(await formRateAllowance("history_correction"))) return fail(formRateLimitedMessage);
  let db;
  try { db = formAdminClient(); } catch { return fail("Requests are temporarily unavailable. Nothing was saved — please try again shortly."); }
  const { data, error } = await db.from("history_correction_requests").insert({
    record_ref: recordRef, request_kind: kind, message, sender_name: name, sender_email: email, submitter_id: userId,
  }).select("id").single();
  if (error || !data?.id) {
    console.error("history correction insert failed", { code: error?.code });
    return fail("Your request could not be saved. Please try again in a moment.");
  }
  try {
    const config = authMailConfig(process.env);
    if (config.kind === "gmail") {
      await deliverAuthMessage({ to: config.user, subject: "New Ìtàn Ilú Mi correction request", text: "A correction or removal request is waiting on the Ìtàn Ilú Mi review page of the staff workspace.", html: "<p>A correction or removal request is waiting on the Ìtàn Ilú Mi review page of the staff workspace.</p>", idempotencyKey: `history-correction/${data.id}` }, config);
      await deliverAuthMessage({ to: email, subject: "We received your Ìtàn Ilú Mi request", text: "Thank you. The Ìtàn Ilú Mi team will check the record and reply to this address. Nothing changes on the site until staff approve it.", html: "<p>Thank you. The Ìtàn Ilú Mi team will check the record and reply to this address. Nothing changes on the site until staff approve it.</p>", idempotencyKey: `history-correction-ack/${data.id}` }, config);
    }
  } catch { console.error("history correction mail unavailable; check the review queue."); }
  return { status: "success", message: "Your request was sent to the Ìtàn Ilú Mi team. We will reply by email after checking; nothing changes on the site until staff approve it." };
}
