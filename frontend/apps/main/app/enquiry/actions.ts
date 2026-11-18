"use server";
import { formAdminClient, formClientKey } from "../../lib/form-server";
import { authMailConfig, deliverAuthMessage } from "../../lib/auth-mail-hook";
export type EnquiryState = { status: "idle" | "success" | "error"; message: string };
const value = (f: FormData, n: string) => typeof f.get(n) === "string" ? (f.get(n) as string).trim() : "";
export async function submitEnquiry(_prev: EnquiryState, form: FormData): Promise<EnquiryState> {
  if (process.env.ENQUIRY_INTAKE_ENABLED !== "true") return { status: "error", message: "Enquiries are temporarily unavailable." };
  const kind = value(form,"kind"), name = value(form,"name"), email = value(form,"email").toLowerCase(), message = value(form,"message");
  if (value(form,"website")) return { status:"success", message:"Thank you. Your enquiry has been submitted." };
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
    const result = await db.rpc("private_enquiry_submit", { p_kind:kind === "support" ? "contact" : kind, p_name:name, p_email:email, p_message:storedMessage });
    if (result.error || !result.data) throw new Error("intake unavailable");
    const ticket = kind === "support" && typeof result.data === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result.data) ? result.data : null;
    // No sender details or message content leave the private staff queue in this notification.
    try {
      const config = authMailConfig(process.env);
      if (config.kind !== "gmail") throw new Error("Gmail unavailable");
      await deliverAuthMessage({ to:config.user, subject:"New EPE LAWA enquiry", text:"A new enquiry is waiting in the private staff workspace.", html:"<p>A new enquiry is waiting in the private staff workspace.</p>", idempotencyKey:`enquiry/${result.data}` }, config);
    } catch { console.error("Enquiry notification delivery unavailable; check the staff queue."); }
    // An acknowledgement is best-effort and never changes whether the enquiry was saved.
    try {
      const config = authMailConfig(process.env);
      const acknowledgement = `Thank you for contacting EPE LAWA. Our team will get back to you soon.${ticket ? ` Your support ticket number is ${ticket}. Please keep it for reference.` : ""}`;
      await deliverAuthMessage({ to:email, subject:ticket ? "Your EPE LAWA support ticket" : "We received your EPE LAWA enquiry", text:acknowledgement, html:`<p>${acknowledgement}</p>`, idempotencyKey:`enquiry-ack/${result.data}` }, config);
    } catch { console.error("Enquiry acknowledgement delivery unavailable."); }
    return { status:"success", message:ticket ? `Your support request has been received. Your ticket number is ${ticket}. Please keep it for reference. Our team will get back to you soon.` : "Your enquiry has been received. Our team will get back to you soon." };
  } catch { return { status:"error", message:"We couldn’t accept your enquiry. Please try again later." }; }
}
