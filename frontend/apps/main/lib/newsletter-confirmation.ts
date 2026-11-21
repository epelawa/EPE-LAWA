import { createHash, randomBytes } from "node:crypto";
import { emailShell } from "./auth-mail-hook";

export type ConfirmationMessage = { to: string; subject: string; text: string; html: string; idempotencyKey: string };
type Pending = { email: string; confirmationHash: string; unsubscribeHash: string; otpHash: string };
type Dependencies = {
  /** Mandatory distributed limit, keyed by a trusted server-derived client key. */
  allow: (clientKey: string) => Promise<boolean>;
  createPending: (pending: Pending) => Promise<boolean>;
  send: (message: ConfirmationMessage) => Promise<void>;
};
type Result = "invalid" | "limited" | "accepted" | "unavailable";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** Server-side building block, not an exposed signup endpoint. */
export async function requestNewsletterConfirmation(input: { email: unknown; consent: boolean; clientKey: string; origin: string }, deps: Dependencies): Promise<Result> {
  if (typeof input.email !== "string" || !input.consent) return "invalid";
  const email = input.email.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || !/^[a-f0-9]{64}$/.test(input.clientKey)) return "invalid";
  let origin: URL;
  try { origin = new URL(input.origin); } catch { return "unavailable"; }
  if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) return "unavailable";
  try {
    if (!await deps.allow(input.clientKey)) return "limited";
    const confirm = randomBytes(32).toString("hex"), unsubscribe = randomBytes(32).toString("hex"), otp = randomBytes(32).toString("hex");
    const pending = { email, confirmationHash: hash(confirm), unsubscribeHash: hash(unsubscribe), otpHash: hash(otp) };
    // The DB cooldown does not reveal whether the address is subscribed.
    if (!await deps.createPending(pending)) return "accepted";
    const confirmUrl = new URL("/newsletter/confirm", origin); confirmUrl.searchParams.set("token", confirm);
    const unsubscribeUrl = new URL("/newsletter/unsubscribe", origin); unsubscribeUrl.searchParams.set("token", unsubscribe);
    const subject = "Confirm your EPE LAWA newsletter subscription";
    const text = `Confirm your newsletter subscription: ${confirmUrl.href}\n\nIf this confirmation starts a new subscription, keep this link to unsubscribe: ${unsubscribeUrl.href}\n\nIf you are already subscribed, keep using your existing unsubscribe link. If you did not request this, ignore this email. The confirmation link expires in 30 minutes.`;
    const html = emailShell("Confirm your subscription", `
      <p style="margin:0 0 16px;line-height:1.6">Please review and confirm your EPE LAWA newsletter subscription.</p>
      <p style="margin:0 0 16px"><a href="${escape(confirmUrl.href)}" style="display:inline-block;padding:12px 22px;background:#477fe0;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:bold">Review and confirm subscription</a></p>
      <p style="margin:0 0 8px;line-height:1.6">If this confirmation starts a new subscription, <a href="${escape(unsubscribeUrl.href)}" style="color:#294b91">keep this link to unsubscribe</a>.</p>
      <p style="margin:0;line-height:1.6">Already subscribed? Keep using your existing unsubscribe link. If you did not request this, ignore this email. The confirmation link expires in 30 minutes.</p>`, "A subscription was requested with this email address on the EPE LAWA website.");
    await deps.send({ to: email, subject, text, html, idempotencyKey: `newsletter/${pending.confirmationHash}` });
    return "accepted";
  } catch { return "unavailable"; }
}
