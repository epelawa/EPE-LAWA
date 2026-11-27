"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { siteUrl } from "../../lib/site";
import { ACTIVITY_COOKIE, ACTIVITY_COOKIE_MAX_AGE_SECONDS } from "../../lib/session-policy";
import { mapAuthProviderError } from "./auth-error";
import { formRateAllowance, formRateMessage, formRateUnavailableMessage } from "../../lib/form-server";
import { recordSigninOutcome, signinAccountGate, signinLockedMessage } from "../../../admin/lib/signin-throttle";
import { availabilityFromRpc, isValidHandle, normalizeHandle } from "../../lib/member-handle";
import { handleResendSignupVerification, handleVerifyEmailOtp, type AuthState } from "../../lib/auth-otp";
export type { AuthState } from "../../lib/auth-otp";
const genericError = "We couldn’t complete that request. Check your details and try again.";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function field(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}
function passwordField(data: FormData): string {
  const value = data.get("password");
  return typeof value === "string" ? value : "";
}
function validEmail(email: string) { return email.length <= 254 && emailPattern.test(email); }
function signupValidationError(input: { email: string; password: string; handle: string; displayName: string }): string | null {
  if (!input.displayName) return "Enter your name to create an account.";
  if (input.displayName.length > 60) return "Your name must be 60 characters or fewer.";
  if (!isValidHandle(input.handle)) return "Choose a handle with 3–24 letters, numbers or underscores.";
  if (!validEmail(input.email)) return "Enter a valid email address.";
  if (input.password.length < 10) return "Use a password with at least 10 characters.";
  if (input.password.length > 128) return "Use a password with no more than 128 characters.";
  return null;
}
function authCallbackUrl(nextPath: string): string {
  const url = new URL("/auth/callback", siteUrl);
  url.searchParams.set("next", nextPath);
  return url.toString();
}
export async function checkHandleAvailability(rawHandle: string): Promise<"available" | "taken" | "unavailable"> {
  const handle = normalizeHandle(typeof rawHandle === "string" ? rawHandle : "");
  if (!isValidHandle(handle)) return "unavailable";
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("member_handle_availability", { p_handle: handle });
    if (error) return "unavailable";
    return availabilityFromRpc(data);
  } catch { return "unavailable"; }
}
export async function verifyHandleBeforeContinue(rawHandle: string): Promise<"available" | "taken" | "unavailable"> {
  return checkHandleAvailability(rawHandle);
}
export async function signUp(_state: AuthState, data: FormData): Promise<AuthState> {
  const email = field(data, "email").toLowerCase();
  const password = passwordField(data);
  const handle = normalizeHandle(field(data, "handle"));
  const displayName = field(data, "displayName");
  const validationError = signupValidationError({ email, password, handle, displayName });
  if (validationError) return { status: "error", message: validationError };
  if (!(await formRateAllowance("auth_signup"))) return { status: "error", message: await formRateMessage() };
  const availability = await checkHandleAvailability(handle);
  if (availability === "taken") return { status: "error", message: "That handle is already in use. Choose another handle." };
  if (availability !== "available") return { status: "error", message: "Handle availability could not be checked because account setup is temporarily unavailable. Please try again later." };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: authCallbackUrl("/dashboard"), data: { handle, display_name: displayName } },
    });
    if (error) return { status: "error", message: mapAuthProviderError(error, "signup") };
    // Hand straight to the OTP card: the confirmation email is sent at this moment,
    // and the card offers verify + resend so nothing waits on a second page load.
    return { status: "notice", message: "Enter the one-time code from the confirmation email we just sent to your inbox to activate your sign-in. If it has not arrived in a few minutes, resend it from the card below.", values: { email } };
  } catch (error) { return { status: "error", message: mapAuthProviderError(error, "signup") }; }
}
export async function completeVerifiedMemberHandle(_state: AuthState, data: FormData): Promise<AuthState> {
  const handle = normalizeHandle(field(data, "handle"));
  if (!isValidHandle(handle)) return { status: "error", message: "Choose a handle with 3–24 letters, numbers or underscores.", values: { handle } };
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user || !user.email_confirmed_at) return { status: "error", message: "Your verified sign-in is required. Please sign in again.", values: { handle } };
    const { data: existing, error: profileError } = await supabase.from("profiles").select("user_id, handle, display_name, deleted_at").eq("user_id", user.id).maybeSingle();
    if (profileError) return { status: "error", message: "We couldn’t confirm your profile state. No account changes were made; please try again later.", values: { handle } };
    if (existing) {
      if (existing.deleted_at) return { status: "error", message: "This profile is unavailable and cannot be reactivated here.", values: { handle } };
      return { status: "error", message: "A member profile already exists. Refresh the page to continue.", values: { handle } };
    }
    const displayName = typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name.trim() : "";
    if (!displayName || displayName.length > 60) return { status: "error", message: "Your profile name needs attention. Contact support; no account changes were made.", values: { handle } };
    const availability = await checkHandleAvailability(handle);
    if (availability === "taken") return { status: "error", message: "That handle is already in use. Choose another handle.", values: { handle } };
    if (availability !== "available") return { status: "error", message: "Handle availability could not be confirmed. No account changes were made; please try again later.", values: { handle } };
    // Deliberately update only this user-selected profile metadata key.
    const { error: updateError } = await supabase.auth.updateUser({ data: { handle } });
    if (updateError) return { status: "error", message: "Your handle could not be saved. Please try again later.", values: { handle } };
    const { data: created, error: bootstrapError } = await supabase.rpc("bootstrap_verified_member_profile");
    if (bootstrapError || created !== true) return { status: "error", message: "The handle was saved, but profile setup could not be confirmed. Try again later or contact support.", values: { handle } };
    redirect("/dashboard");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { status: "error", message: "We couldn’t complete profile setup. No further changes were made.", values: { handle } };
  }
}

export async function signIn(_state: AuthState, data: FormData): Promise<AuthState> {
  const email = field(data, "email").toLowerCase();
  const password = passwordField(data);
  if (!validEmail(email)) return { status: "error", message: "Enter a valid email address.", fieldErrors: { email: "Enter a valid email address." } };
  if (!password) return { status: "error", message: "Enter your password.", fieldErrors: { password: "Enter your password." } };
  if (password.length > 128) return { status: "error", message: "Your password must be no more than 128 characters.", fieldErrors: { password: "Your password must be no more than 128 characters." } };
  // Per-account lock first: checking it never counts an attempt, and a locked
  // email should not spend the network's sign-in budget.
  const gate = await signinAccountGate(email);
  if (!gate.allowed) {
    return gate.reason === "locked"
      ? { status: "error", message: signinLockedMessage(gate.retryAfterSeconds), values: { email } }
      : { status: "error", message: formRateUnavailableMessage, values: { email } };
  }
  if (!(await formRateAllowance("auth_signin", 15))) return { status: "error", message: await formRateMessage() };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.code === "invalid_credentials") {
        const lockedFor = await recordSigninOutcome(email, false);
        if (lockedFor > 0) return { status: "error", message: signinLockedMessage(lockedFor), values: { email } };
        return { status: "error", message: mapAuthProviderError(error, "signin") };
      }
      if (error.code === "email_not_confirmed") {
        // The password was right; only the address is unconfirmed.
        await recordSigninOutcome(email, true);
        return { status: "notice", message: "Enter the one-time code we sent to this address to confirm your email and finish signing in. If it has not arrived in a few minutes, resend it from the card below.", values: { email } };
      }
      return { status: "error", message: mapAuthProviderError(error, "signin") };
    }
    await recordSigninOutcome(email, true);
    // Sign-in goes straight to the member dashboard for a finished profile;
    // only accounts that still need a handle or bootstrap see the completion step.
    const userId = data.user?.id;
    if (userId) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, deleted_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (!profileError && profile && !profile.deleted_at) {
        try {
          const cookieStore = await cookies();
          cookieStore.set(ACTIVITY_COOKIE.member, String(Date.now()), {
            path: "/",
            maxAge: ACTIVITY_COOKIE_MAX_AGE_SECONDS,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            httpOnly: false,
          });
        } catch {
          // The client guard records activity on the dashboard even if this write is refused.
        }
        redirect("/dashboard");
      }
    }
    redirect("/dashboard");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { status: "error", message: mapAuthProviderError(error, "signin") };
  }
}
export async function requestPasswordReset(_state: AuthState, data: FormData): Promise<AuthState> {
  const email = field(data, "email").toLowerCase();
  if (!validEmail(email)) return { status: "error", message: "Enter a valid email address." };
  if (!(await formRateAllowance("auth_reset"))) return { status: "error", message: await formRateMessage() };
  try {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: authCallbackUrl("/auth/new-password") });
    return { status: "notice", message: "If an account exists for that address, password-reset instructions may be sent. Delivery depends on this project’s configured email provider." };
  } catch { return { status: "error", message: genericError }; }
}
export async function resendSignupVerification(_state: AuthState, data: FormData): Promise<AuthState> {
  if (!(await formRateAllowance("auth_resend"))) return { status: "error", message: await formRateMessage() };
  return handleResendSignupVerification(data, createClient, authCallbackUrl("/dashboard"));
}
export async function updatePassword(_state: AuthState, data: FormData): Promise<AuthState> {
  const password = passwordField(data);
  if (password.length < 10 || password.length > 128) return { status: "error", message: "Use a password between 10 and 128 characters." };
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { status: "error", message: "Your recovery session is missing or expired. Request a new password reset." };
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { status: "error", message: genericError };
    // A completed reset proves control of the inbox, so it lifts any sign-in lock.
    if (user.email) await recordSigninOutcome(user.email, true);
    redirect("/dashboard");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { status: "error", message: genericError };
  }
}
export async function verifyEmailOtp(_state: AuthState, data: FormData): Promise<AuthState> {
  if (!(await formRateAllowance("auth_otp", 10))) return { status: "error", message: await formRateMessage() };
  const outcome = await handleVerifyEmailOtp(data, createClient, authCallbackUrl("/dashboard"));
  if ("redirectTo" in outcome) redirect(outcome.redirectTo);
  return outcome;
}
export async function signOut() {
  try { const supabase = await createClient(); await supabase.auth.signOut(); } catch { /* Always return to a signed-out screen. */ }
  try { (await cookies()).delete(ACTIVITY_COOKIE.member); } catch { /* A missing cookie store must not block sign-out. */ }
  redirect("/login");
}
export async function signOutEverywhere() {
  try { const supabase = await createClient(); await supabase.auth.signOut({ scope: "global" }); } catch { /* Always return to a signed-out screen. */ }
  try { (await cookies()).delete(ACTIVITY_COOKIE.member); } catch { /* A missing cookie store must not block sign-out. */ }
  redirect("/login?signed-out=all");
}
