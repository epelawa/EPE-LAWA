"use server";
import { formAdminClient, formClientKey } from "../../lib/form-server";
import { verifyTurnstile } from "../../lib/turnstile";
import { authMailConfig, deliverAuthMessage, emailShell } from "../../lib/auth-mail-hook";

// Each kind is routed to the right staff channel: the notification names the channel
// and the queue to open, so the message reaches the people who handle it.
const channels: Record<string, { label: string; queue: string }> = {
  contact: { label: "general contact", queue: "Enquiries · contact" },
  advertising: { label: "advertising", queue: "Enquiries · advertising" },
  correction: { label: "correction request", queue: "Enquiries · correction" },
  support: { label: "support request", queue: "Enquiries · contact (support ticket)" },
};
export type EnquiryState = { status: "idle" | "success" | "error"; message: string; ticket?: string; acknowledgement?: "accepted" | "unavailable" };
const value = (f: FormData, n: string) => typeof f.get(n) === "string" ? (f.get(n) as string).trim() : "";
export async function submitEnquiry(_prev: EnquiryState, form: FormData): Promise<EnquiryState> {
  if (process.env.ENQUIRY_INTAKE_ENABLED !== "true") return { status: "error", message: "Enquiries are temporarily unavailable." };
  const kind = value(form,"kind"), name = value(form,"name"), email = value(form,"email").toLowerCase(), message = value(form,"message");
  if (value(form,"website")) return { status:"success", message:"Thank you. Your enquiry has been submitted." };
  if ((await verifyTurnstile(form)) === "fail") return { status: "error", message: "Verification failed. Complete the human-verification box and send again." };
  if (!['contact','advertising','correction','support'].includes(kind) || name.length < 2 || name.length > 100 || /[\x00-\x1f\x7f]/.test(name) || email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || message.length < 10 || message.length > 5000 || message.includes('\0')) return { status:"error", message:"Please complete all fields with a valid email and a message of 10 to 5,000 characters." };
  const whatsapp = value(form,"whatsapp"), phone = value(form,"phone");
  const phonePattern = /^\+?[0-9][0-9 ()-]{6,23}$/;
  if (kind === "advertising" && (!phonePattern.test(whatsapp) || (phone && !phonePattern.test(phone)) || message.length > 4900)) return {status:"error", message:"Please enter a valid WhatsApp number and alternative phone number."};
  if (kind === "support" && message.length > 4980) return {status:"error", message:"Please keep your support message under 4,980 characters."};
  const storedMessage = kind === "support" ? `[Support request]\n${message}` : kind === "advertising" ? `WhatsApp: ${whatsapp}\n${phone ? `Alternative phone: ${phone}\n` : ""}\n${message}` : message;
  try {
    const key = await formClientKey(), db = formAdminClient();
    const limit = await db.rpc("form_rate_limit", { p_scope:"enquiry", p_fingerprint:key });
    if (limit.error || limit.data !== true) return { status:"error", message:"We couldn’t accept your enquiry. Please try again later." };
    let result;
    try { result = await db.rpc("private_enquiry_submit", { p_kind:kind === "support" ? "contact" : kind, p_name:name, p_email:email, p_message:storedMessage }); }
    catch { return { status:"error", message:"We couldn’t confirm whether your enquiry was saved. Please contact support before trying again to avoid a duplicate." }; }
    if (result.error || !result.data) return { status:"error", message:"We couldn’t confirm whether your enquiry was saved. Please contact support before trying again to avoid a duplicate." };
    const ticket = kind === "support" && typeof result.data === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result.data) ? result.data : null;
    if (kind === "support" && !ticket) return { status:"error", message:"We couldn’t confirm your ticket number. Please contact support before trying again to avoid a duplicate." };
    // No sender details or message content leave the private staff queue in this notification.
    const channel = channels[kind] ?? channels.contact;
    try {
      const config = authMailConfig(process.env);
      if (config.kind !== "gmail") throw new Error("Gmail unavailable");
      const stafferText = `A new ${channel.label} is waiting in the private staff workspace. Open “${channel.queue}” to reply.`;
      await deliverAuthMessage({ to:config.user, subject:`New ${channel.label} — staff queue`, text:stafferText, html:emailShell(`New ${channel.label}`, `<p style="margin:0 0 12px;line-height:1.6">A new <strong>${channel.label}</strong> is waiting in the private staff workspace.</p><p style="margin:0;line-height:1.6">Open the staff workspace and check the <strong>${channel.queue}</strong> queue to pick it up.</p>`, " routed to the right channel automatically."), idempotencyKey:`enquiry/${result.data}` }, config);
    } catch { console.error("Enquiry notification delivery unavailable; check the staff queue."); }
    // An acknowledgement is best-effort and never changes whether the enquiry was saved.
    let acknowledgementStatus: "accepted" | "unavailable" = "unavailable";
    try {
      const config = authMailConfig(process.env);
      const ackByKind: Record<string, string> = {
        advertising: "Thank you for your interest in advertising with EPE LAWA. Our advertising team reviews every request and will get back to you soon.",
        correction: "Thank you for your correction request. Our editorial team reviews every correction and will update the record if it is verified.",
        support: "Thank you for contacting EPE LAWA support. Our team will get back to you soon.",
        contact: "Thank you for contacting EPE LAWA. Our team will get back to you soon.",
      };
      const base = ackByKind[kind] ?? ackByKind.contact;
      const acknowledgement = `${base}${ticket ? ` Your support ticket number is ${ticket}. Please keep it for reference.` : ""}`;
      await deliverAuthMessage({ to:email, subject:ticket ? "Your EPE LAWA support ticket" : `We received your ${channel.label}`, text:acknowledgement, html:emailShell(ticket ? "Your support ticket is confirmed" : "We received your message", `<p style="margin:0;line-height:1.6">${acknowledgement}</p>`, " routed to the right team automatically.") , idempotencyKey:`enquiry-ack/${result.data}` }, config);
      acknowledgementStatus = "accepted";
    } catch { console.error("Enquiry acknowledgement delivery unavailable."); }
    return { status:"success", message:ticket ? `Your support request has been received. Your ticket number is ${ticket}. Please keep it for reference. Our team will get back to you soon.` : "Your enquiry has been received. Our team will get back to you soon.", ...(ticket ? { ticket, acknowledgement: acknowledgementStatus } : {}) };
  } catch { return { status:"error", message:"We couldn’t accept your enquiry. Please try again later." }; }
}
