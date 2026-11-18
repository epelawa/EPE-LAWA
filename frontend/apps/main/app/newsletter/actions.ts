"use server";

import { createHash, randomBytes, randomInt } from "node:crypto";
import { sendNewsletterConfirmation } from "../../lib/newsletter-mailer";
import { createClient } from "../../lib/supabase";

export type NewsletterState = { status: "idle" | "success" | "error"; message: string };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const idleState: NewsletterState = { status: "idle", message: "" };

function formValue(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function subscribeNewsletter(_previous: NewsletterState = idleState, data: FormData): Promise<NewsletterState> {
  const email = formValue(data, "email").toLowerCase();
  if (!emailPattern.test(email) || email.length > 254) return { status: "error", message: "Enter a valid email address." };

  const unsubscribeToken = randomBytes(32).toString("hex");
  const managementOtp = String(randomInt(100000, 1000000));
  const tokenHash = hash(unsubscribeToken);
  const otpHash = hash(managementOtp);
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("newsletter_subscribe_request", {
      p_email: email,
      p_unsubscribe_token_hash: tokenHash,
      p_management_otp_hash: otpHash,
      p_otp_expires_at: expiresAt,
    });
    if (error) return { status: "error", message: "We could not save your subscription. Please try again later." };

    try {
      await sendNewsletterConfirmation({ email, unsubscribeToken, managementOtp });
    } catch {
      await supabase.rpc("newsletter_unsubscribe", { p_unsubscribe_token_hash: tokenHash });
      return { status: "error", message: "Your subscription was not completed because the confirmation email could not be sent." };
    }

    return { status: "success", message: "You’re subscribed. A confirmation email with your management code is on its way." };
  } catch {
    return { status: "error", message: "Newsletter sign-up is temporarily unavailable. Please try again later." };
  }
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
