import "server-only";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authMailConfig, deliverAuthMessage, emailShell } from "../auth-mail-hook";
import { absoluteUrl } from "../site";
import { withGreeting } from "../ai/greeting";
import { AI_REPLY_DISCLOSURE, escapeHtml, scrubReply } from "../ai/jobs/enquiries";
import { SUPPORT_CATEGORIES, type SupportCategory } from "./rules";

export { SUPPORT_CATEGORIES, type SupportCategory };

/**
 * Support tickets. A requester reaches their ticket only through a private
 * link (reference + secret token). The token is an HMAC of the ticket id, so
 * every email (confirmation, staff or AI replies) can carry the same link
 * without storing the token itself; only its SHA-256 is kept.
 */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newReference(): string {
  let value = "";
  for (let index = 0; index < 6; index += 1) value += ALPHABET[randomInt(ALPHABET.length)];
  return `EPE-${value}`;
}

function linkSecret(): string | null {
  const secret = process.env.SUPPORT_LINK_SECRET || process.env.FORM_RATE_SECRET || "";
  return secret.length >= 16 ? secret : null;
}

export function accessToken(ticketId: string): string {
  const secret = linkSecret();
  // Without a server secret each ticket gets a random token (only the first email carries it).
  if (!secret) return randomBytes(24).toString("base64url");
  return createHmac("sha256", secret).update(`support-ticket:${ticketId}`).digest("base64url").slice(0, 32);
}

export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenMatches(token: string | null | undefined, storedHash: string): boolean {
  if (!token || token.length < 16 || token.length > 64 || !/^[A-Za-z0-9_-]+$/.test(token)) return false;
  const a = Buffer.from(tokenHash(token), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function ticketUrl(reference: string, ticketId: string): string | null {
  if (!linkSecret()) return null;
  return absoluteUrl(`/support/ticket/${reference}?t=${accessToken(ticketId)}`);
}

export type TicketRow = {
  id: string;
  reference: string;
  access_hash: string;
  requester_name: string;
  requester_email: string;
  category: SupportCategory;
  priority: string;
  status: string;
  subject: string;
  needs_human: boolean;
  ai_summary: string | null;
  created_at: string;
  last_message_at: string;
};
export const TICKET_COLUMNS = "id,reference,access_hash,requester_name,requester_email,category,priority,status,subject,needs_human,ai_summary,created_at,last_message_at";

/** Loads a ticket for the public page only when the private link matches. */
export async function ticketForLink(db: SupabaseClient, reference: string, token: string | null | undefined): Promise<TicketRow | null> {
  if (!/^EPE-[A-Z0-9]{6}$/.test(reference)) return null;
  const { data } = await db.from("support_tickets").select(TICKET_COLUMNS).eq("reference", reference).maybeSingle();
  if (!data) return null;
  const row = data as TicketRow;
  return tokenMatches(token, row.access_hash) ? row : null;
}

type EmailKind = "created" | "staff" | "ai" | "resolved" | "link";

const SUBJECTS: Record<EmailKind, (ticket: { reference: string; subject: string }) => string> = {
  created: (ticket) => `We've got your request — ticket ${ticket.reference}`,
  staff: (ticket) => `Re: ${ticket.subject} [${ticket.reference}]`,
  ai: (ticket) => `Re: ${ticket.subject} [${ticket.reference}] (AI assistant reply)`,
  resolved: (ticket) => `Ticket ${ticket.reference} is resolved`,
  link: (ticket) => `Your link to ticket ${ticket.reference}`,
};

/** Every ticket email greets the person by name and carries the private ticket link. */
export async function sendTicketEmail(ticket: { id: string; reference: string; subject: string; requester_name: string; requester_email: string }, kind: EmailKind, body: string, idempotencyKey: string, options: { greeted?: boolean } = {}): Promise<boolean> {
  const link = ticketUrl(ticket.reference, ticket.id);
  const clean = kind === "ai" ? scrubReply(body) : body.slice(0, 8000);
  const greeting = options.greeted ? clean : withGreeting(ticket.requester_name, `${ticket.id}:${idempotencyKey}`, clean);
  const footer = link ? `View the conversation or reply: ${link}` : `Quote ticket ${ticket.reference} when you contact us.`;
  const disclosure = kind === "ai" ? `\n\n—\n${AI_REPLY_DISCLOSURE}` : "";
  const text = `${greeting}\n\n${footer}${disclosure}`;
  const paragraphs = greeting.split(/\n{2,}/).map((part) => `<p style="margin:0 0 12px;line-height:1.6">${escapeHtml(part).replace(/\n/g, "<br />")}</p>`).join("");
  const banner = kind === "ai" ? `<p style="margin:0 0 14px;padding:10px 12px;border-radius:8px;background:#eef4ff;color:#17264a;font-size:13px;line-height:1.5"><strong>AI assistant reply.</strong> ${escapeHtml(AI_REPLY_DISCLOSURE)}</p>` : "";
  const button = link ? `<p style="margin:18px 0 6px"><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#1d4ed8;color:#ffffff;font-weight:bold;text-decoration:none">Open ticket ${escapeHtml(ticket.reference)}</a></p>` : `<p style="margin:12px 0 0;color:#475069">Ticket <strong>${escapeHtml(ticket.reference)}</strong></p>`;
  try {
    await deliverAuthMessage({
      to: ticket.requester_email,
      subject: SUBJECTS[kind](ticket).slice(0, 180),
      text,
      html: emailShell(kind === "created" ? "Your support ticket is open" : kind === "resolved" ? "Your ticket is resolved" : kind === "link" ? "Your private ticket link" : `Ticket ${ticket.reference}`, `${banner}${paragraphs}${button}`, "You are receiving this because you opened an EPE LAWA support ticket. Keep this link private."),
      idempotencyKey: `support/${idempotencyKey}`.slice(0, 200),
    }, authMailConfig(process.env));
    return true;
  } catch {
    return false;
  }
}

/** Adds a message and moves the ticket on, through the service role. */
export async function addTicketMessage(db: SupabaseClient, ticketId: string, author: "customer" | "ai" | "system", body: string, options: { internal?: boolean; status?: string; needsHuman?: boolean; extra?: Record<string, unknown> } = {}): Promise<boolean> {
  const inserted = await db.from("support_ticket_messages").insert({ ticket_id: ticketId, author_kind: author, body: body.slice(0, 8000), internal: options.internal ?? false });
  if (inserted.error) return false;
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { ...(options.extra ?? {}) };
  if (!options.internal) patch.last_message_at = now;
  if (author === "customer") patch.last_customer_message_at = now;
  if (options.status) patch.status = options.status;
  if (typeof options.needsHuman === "boolean") patch.needs_human = options.needsHuman;
  if (options.status === "resolved" || options.status === "closed") patch.resolved_at = now;
  if (Object.keys(patch).length) {
    const updated = await db.from("support_tickets").update(patch).eq("id", ticketId);
    if (updated.error) return false;
  }
  return true;
}
