"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase";
import { formRateAllowance, formRateLimitedMessage } from "../../lib/form-server";

export type ClaimState = { status: "idle" | "error" | "success"; message: string };

export async function submitBusinessClaim(_prev: ClaimState, form: FormData): Promise<ClaimState> {
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return { status: "error", message: "Sign in with your member account to claim a business." };
  if (!user.email_confirmed_at) return { status: "error", message: "Verify your email address before claiming a business." };
  const businessId = String(form.get("business_id") ?? "").trim();
  const slug = String(form.get("slug") ?? "").trim();
  const message = String(form.get("message") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(businessId) || message.length < 10 || message.length > 1000) {
    return { status: "error", message: "Describe your connection to this business in 10–1000 characters." };
  }
  if (!(await formRateAllowance("business_claim"))) {
    return { status: "error", message: formRateLimitedMessage };
  }
  const { error } = await db.rpc("member_business_claim", { p_business_id: businessId, p_message: message });
  if (error) {
    const reason = error.message;
    const text = reason === "claim_already_open"
      ? "You already have an open claim for this business."
      : reason === "claim_already_owner"
        ? "This listing is already linked to your account."
        : "The claim could not be submitted right now. Please try again.";
    return { status: "error", message: text };
  }
  if (slug) {
    revalidatePath(`/business-directory/${slug}`);
    redirect(`/business-directory/${encodeURIComponent(slug)}?claim=sent`);
  }
  return { status: "success", message: "Your claim was sent to the team. They will verify your connection and confirm by email." };
}
