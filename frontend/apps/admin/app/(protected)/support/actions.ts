"use server";
import { adminRedirect as redirect } from "../../../lib/admin-redirect";
import { createStaffClient } from "../../../lib/supabase";
import { adminHref } from "../../../lib/admin-path";
import { sendTicketEmail } from "../../../../main/lib/support/tickets";
import { isCategory, isPriority, SUPPORT_STATUSES } from "../../../../main/lib/support/rules";

const UUID = /^[0-9a-f-]{36}$/i;
const text = (form: FormData, name: string) => (typeof form.get(name) === "string" ? String(form.get(name)) : "");
const isStatus = (value: string) => SUPPORT_STATUSES.some((entry) => entry.key === value);

/** A staff reply (emailed to the requester) or an internal note (never emailed). */
export async function replyToTicket(form: FormData) {
  const id = text(form, "id");
  const body = text(form, "body").trim();
  const internal = text(form, "internal") === "on";
  const status = text(form, "status");
  if (!UUID.test(id)) return await redirect(`${adminHref("/support")}?result=failed`);
  const back = adminHref(`/support/${id}`);
  if (body.length < 2 || body.length > 8000) return await redirect(`${back}?result=short`);
  const db = await createStaffClient();
  const { data, error } = await db.rpc("staff_support_reply", { p_id: id, p_body: body, p_internal: internal, p_status: isStatus(status) ? status : null });
  if (error || !data) return await redirect(`${back}?result=failed`);
  if (internal) return await redirect(`${back}?result=noted`);
  const ticket = data as { reference: string; requester_name: string; requester_email: string; subject: string; status: string };
  const emailed = await sendTicketEmail({ id, ...ticket }, ticket.status === "resolved" ? "resolved" : "staff", body, `${id}/staff/${Date.now()}`);
  return await redirect(`${back}?result=${emailed ? "sent" : "saved-not-emailed"}`);
}

export async function updateTicket(form: FormData) {
  const id = text(form, "id");
  if (!UUID.test(id)) return await redirect(`${adminHref("/support")}?result=failed`);
  const status = text(form, "status"), priority = text(form, "priority"), category = text(form, "category");
  const db = await createStaffClient();
  const { error } = await db.rpc("staff_support_update", {
    p_id: id,
    p_status: isStatus(status) ? status : null,
    p_priority: isPriority(priority) ? priority : null,
    p_category: isCategory(category) ? category : null,
    p_assign_me: text(form, "assign_me") === "on",
  });
  return await redirect(`${adminHref(`/support/${id}`)}?result=${error ? "failed" : "updated"}`);
}
