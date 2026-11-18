"use server";

import { createHash } from "node:crypto";
import { createClient } from "../../lib/supabase";
import { formAdminClient, formClientKey } from "../../lib/form-server";
import { requestNewsletterConfirmation } from "../../lib/newsletter-confirmation";
import { authMailConfig, deliverAuthMessage } from "../../lib/auth-mail-hook";

export type NewsletterState = { status: "idle" | "success" | "error"; message: string };

const idleState: NewsletterState = { status: "idle", message: "" };

function formValue(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

// Disabled unless explicitly enabled after credentials, rate limiter and delivery
// are reviewed. Never use the old, unsafe anonymous signup RPC.
export async function subscribeNewsletter(_previous: NewsletterState = idleState, data: FormData): Promise<NewsletterState> {
  if (process.env.NEWSLETTER_SIGNUP_ENABLED !== "true") return { status: "error", message: "Newsletter sign-up is temporarily unavailable." };
  try {
    const clientKey = await formClientKey(), client = formAdminClient(), mail = authMailConfig(process.env);
    const result = await requestNewsletterConfirmation({ email: data.get("email"), consent: data.get("consent") === "yes", clientKey, origin: process.env.NEXT_PUBLIC_SITE_URL ?? "" }, {
      allow: async key => { const { data, error } = await client.rpc("form_rate_limit", { p_scope: "newsletter", p_fingerprint: key }); if (error) throw error; return data === true; },
      createPending: async pending => { const { data, error } = await client.rpc("newsletter_request_verified", { p_email: pending.email, p_confirmation_hash: pending.confirmationHash, p_unsubscribe_hash: pending.unsubscribeHash, p_otp_hash: pending.otpHash }); if (error) throw error; return data === true; },
      send: async message => deliverAuthMessage(message, mail),
    });
    if (result === "invalid") return { status: "error", message: "Enter a valid email address and agree to receive the newsletter." };
    if (result === "limited") return { status: "error", message: "Too many requests. Please try again later." };
    if (result === "unavailable") return { status: "error", message: "We couldn’t process your request. Please try again later." };
    return { status: "success", message: "Please check your email for a confirmation link to proceed with your request." };
  } catch { return { status: "error", message: "We couldn’t process your request. Please try again later." }; }
}

export async function confirmNewsletter(_previous: NewsletterState = idleState, data: FormData): Promise<NewsletterState> {
  if (process.env.NEWSLETTER_SIGNUP_ENABLED !== "true") return { status: "error", message: "Newsletter sign-up is temporarily unavailable." };
  const token = formValue(data, "token");
  if (!/^[a-f0-9]{64}$/.test(token)) return { status: "error", message: "This confirmation link is invalid or expired." };
  try {
    const client = formAdminClient(), key = await formClientKey();
    const limit = await client.rpc("form_rate_limit", { p_scope: "newsletter", p_fingerprint: key });
    if (limit.error || limit.data !== true) return { status: "error", message: "We couldn’t process your request. Please try again later." };
    const { data: result, error } = await client.rpc("newsletter_confirm_verified", { p_confirmation_hash: hash(token) });
    if (error || !["activated", "already_active"].includes(result)) return { status: "error", message: "This confirmation link is invalid or expired." };
    return { status: "success", message: result === "activated" ? "Your newsletter subscription is confirmed. Keep the unsubscribe link in your email." : "Your newsletter subscription is already active. Keep your existing unsubscribe link." };
  } catch { return { status: "error", message: "We couldn’t process your request. Please try again later." }; }
}

export async function unsubscribeNewsletter(_previous: NewsletterState = idleState, data: FormData): Promise<NewsletterState> {
  const token = formValue(data, "token");
  if (!/^[a-f0-9]{64}$/.test(token)) return { status: "error", message: "This unsubscribe link is invalid or incomplete." };
  try {
    const supabase = await createClient();
    const { data: removed, error } = await supabase.rpc("newsletter_unsubscribe", { p_unsubscribe_token_hash: hash(token) });
    if (error) return { status: "error", message: "We could not update your subscription. Please try again later." };
    return removed ? { status: "success", message: "You have been unsubscribed from the EPE LAWA newsletter." } : { status: "success", message: "This newsletter link has already been used or the address is no longer subscribed." };
  } catch {
    return { status: "error", message: "We could not update your subscription. Please try again later." };
  }
}
