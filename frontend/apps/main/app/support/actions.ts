"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { formAdminClient, formRateAllowance, formRateMessage } from "../../lib/form-server";
import { verifyTurnstile } from "../../lib/turnstile";
import { authMailConfig, deliverAuthMessage, emailShell } from "../../lib/auth-mail-hook";
import { accessToken, addTicketMessage, newReference, sendTicketEmail, ticketForLink, ticketUrl, tokenHash, TICKET_COLUMNS, type TicketRow } from "../../lib/support/tickets";
import { categoryLabel, validateNewTicket, validateTicketReply } from "../../lib/support/rules";

export type TicketFormState = { status: "idle" | "success" | "error"; message: string; reference?: string; link?: string | null; emailed?: boolean };

const field = (form: FormData, name: string) => (typeof form.get(name) === "string" ? String(form.get(name)) : "");

function intakeOpen(): boolean {
  return process.env.ENQUIRY_INTAKE_ENABLED === "true" && process.env.SUPPORT_TICKETS_ENABLED !== "false";
}

/** Opens a ticket: saved first, then a confirmation with the private link, then a staff heads-up. */
export async function openSupportTicket(_previous: TicketFormState, form: FormData): Promise<TicketFormState> {
  if (!intakeOpen()) return { status: "error", message: "Support tickets are temporarily unavailable. Nothing was saved." };
  if (field(form, "website")) return { status: "success", message: "Thank you. Your request has been received." };
  const checked = validateNewTicket({ name: field(form, "name"), email: field(form, "email"), category: field(form, "category"), subject: field(form, "subject"), message: field(form, "message") });
  if (!checked.ok) return { status: "error", message: checked.problem };
  if ((await verifyTurnstile(form)) === "fail") return { status: "error", message: "Verification failed. Complete the human-verification box and send again." };
  if (!(await formRateAllowance("enquiry", 5))) return { status: "error", message: await formRateMessage() };
  const input = checked.value;
  const db = formAdminClient();
  let ticket: TicketRow | null = null;
  for (let attempt = 0; attempt < 4 && !ticket; attempt += 1) {
    const id = randomUUID();
    const reference = newReference();
    const { data, error } = await db.from("support_tickets").insert({
      id,
      reference,
      access_hash: tokenHash(accessToken(id)),
      requester_name: input.name,
      requester_email: input.email,
      category: input.category,
      subject: input.subject,
    }).select(TICKET_COLUMNS).maybeSingle();
    if (!error && data) ticket = data as TicketRow;
    else if (error && error.code !== "23505") break;
  }
  if (!ticket) return { status: "error", message: "We couldn't open your ticket just now. Nothing was saved — please try again in a few minutes." };
  const saved = await addTicketMessage(db, ticket.id, "customer", input.message);
  if (!saved) {
    await db.from("support_tickets").delete().eq("id", ticket.id);
    return { status: "error", message: "We couldn't save your message. Nothing was kept — please try again." };
  }
  const emailed = await sendTicketEmail(ticket, "created", `Thanks for contacting EPE LAWA support. Your request “${input.subject}” (${categoryLabel(input.category)}) is now ticket ${ticket.reference}.\n\nOur assistant and team will look at it shortly. You can follow the conversation and reply from your private ticket page at any time.`, `${ticket.id}/created`);
  try {
    const config = authMailConfig(process.env);
    if (config.kind === "gmail") {
      await deliverAuthMessage({
        to: config.user,
        subject: `New support ticket ${ticket.reference} — staff desk`,
        text: `A new support ticket (${categoryLabel(input.category)}) is waiting. Open Admin → Support tickets to pick it up.`,
        html: emailShell("New support ticket", `<p style="margin:0;line-height:1.6">A new <strong>${categoryLabel(input.category)}</strong> ticket is waiting in <strong>Admin → Support tickets</strong>.</p>`, "Routed to the support desk automatically."),
        idempotencyKey: `support-staff/${ticket.id}`,
      }, config);
    }
  } catch { /* the live dot on the admin menu still shows the new ticket */ }
  revalidatePath("/support");
  return { status: "success", message: `Ticket ${ticket.reference} is open.`, reference: ticket.reference, link: ticketUrl(ticket.reference, ticket.id), emailed };
}

export type ReplyState = { status: "idle" | "success" | "error"; message: string };

export async function replyToSupportTicket(_previous: ReplyState, form: FormData): Promise<ReplyState> {
  const reference = field(form, "reference");
  const token = field(form, "token");
  const reply = validateTicketReply(field(form, "message"));
  if (!reply.ok) return { status: "error", message: reply.problem };
  if (!(await formRateAllowance("enquiry", 20))) return { status: "error", message: await formRateMessage() };
  const db = formAdminClient();
  const ticket = await ticketForLink(db, reference, token);
  if (!ticket) return { status: "error", message: "This ticket link is not valid any more. Use “Find my ticket” on the Support page to get a fresh link." };
  if (ticket.status === "closed") return { status: "error", message: "This ticket is closed. Open a new ticket and mention " + ticket.reference + "." };
  // A reply reopens the ticket; one already with staff stays with staff.
  const ok = await addTicketMessage(db, ticket.id, "customer", reply.value, { status: ticket.needs_human ? "in_progress" : "open" });
  if (!ok) return { status: "error", message: "Your reply could not be saved. Please try again." };
  revalidatePath(`/support/ticket/${ticket.reference}`);
  return { status: "success", message: "Reply sent. We'll email you when there's an answer." };
}

export async function resolveSupportTicket(form: FormData): Promise<void> {
  const reference = field(form, "reference");
  const token = field(form, "token");
  const db = formAdminClient();
  const ticket = await ticketForLink(db, reference, token);
  if (!ticket || ticket.status === "resolved" || ticket.status === "closed") return;
  await addTicketMessage(db, ticket.id, "system", "The requester marked this ticket as resolved.", { status: "resolved", needsHuman: false });
  revalidatePath(`/support/ticket/${ticket.reference}`);
}

export async function findSupportTicket(_previous: ReplyState, form: FormData): Promise<ReplyState> {
  const reference = field(form, "reference").trim().toUpperCase();
  const email = field(form, "email").trim().toLowerCase();
  const answer: ReplyState = { status: "success", message: "If that reference and email match a ticket, we've emailed you its private link. Check your inbox and spam folder." };
  if (!/^EPE-[A-Z0-9]{6}$/.test(reference) || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) return { status: "error", message: "Enter the ticket reference (like EPE-7K3QX9) and the email you used." };
  if (!(await formRateAllowance("enquiry", 5))) return { status: "error", message: await formRateMessage() };
  const db = formAdminClient();
  const { data } = await db.from("support_tickets").select(TICKET_COLUMNS).eq("reference", reference).maybeSingle();
  const ticket = data as TicketRow | null;
  if (ticket && ticket.requester_email.toLowerCase() === email) {
    await sendTicketEmail(ticket, "link", `Here is the private link to your ticket “${ticket.subject}”.`, `${ticket.id}/link/${Math.floor(Date.now() / 600_000)}`);
  }
  return answer;
}
