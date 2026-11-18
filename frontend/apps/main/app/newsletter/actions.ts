"use server";

import { createHash } from "node:crypto";
import { createClient } from "../../lib/supabase";

export type NewsletterState = { status: "idle" | "success" | "error"; message: string };

const idleState: NewsletterState = { status: "idle", message: "" };

function formValue(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

// The old anonymous signup RPC permits token replacement for any address.
// Fail closed until a rate-limited, mailbox-verified flow is deployed and tested.
export async function subscribeNewsletter(_previous: NewsletterState = idleState, _data: FormData): Promise<NewsletterState> {
  return { status: "error", message: "Newsletter sign-up is temporarily unavailable. Existing unsubscribe links remain available." };
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
