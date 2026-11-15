"use server";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { siteUrl } from "../../lib/site";
import { mapAuthProviderError } from "./auth-error";
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
  const availability = await checkHandleAvailability(handle);
  if (availability === "taken") return { status: "error", message: "That handle is already in use. Choose another handle." };
  if (availability !== "available") return { status: "error", message: "Handle availability could not be checked because account setup is temporarily unavailable. Please try again later." };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: authCallbackUrl("/auth/complete"), data: { handle, display_name: displayName } },
    });
    if (error) return { status: "error", message: mapAuthProviderError(error, "signup") };
    return { status: "notice", message: "Your account request was received. If email verification is required, use the code or secure link in the EPE LAWA confirmation email before signing in. Delivery depends on this project’s configured email provider." };
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
    redirect("/auth/complete");
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
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { status: "error", message: mapAuthProviderError(error, "signin") };
    redirect("/auth/complete");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { status: "error", message: mapAuthProviderError(error, "signin") };
  }
}
export async function requestPasswordReset(_state: AuthState, data: FormData): Promise<AuthState> {
  const email = field(data, "email").toLowerCase();
  if (!validEmail(email)) return { status: "error", message: "Enter a valid email address." };
  try {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: authCallbackUrl("/auth/new-password") });
    return { status: "notice", message: "If an account exists for that address, password-reset instructions may be sent. Delivery depends on this project’s configured email provider." };
  } catch { return { status: "error", message: genericError }; }
}
export async function resendSignupVerification(_state: AuthState, data: FormData): Promise<AuthState> {
  return handleResendSignupVerification(data, createClient, authCallbackUrl("/auth/complete"));
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
    redirect("/auth/complete");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { status: "error", message: genericError };
  }
}
export async function verifyEmailOtp(_state: AuthState, data: FormData): Promise<AuthState> {
  const outcome = await handleVerifyEmailOtp(data, createClient, authCallbackUrl("/auth/complete"));
  if ("redirectTo" in outcome) redirect(outcome.redirectTo);
  return outcome;
}
export async function signOut() {
  try { const supabase = await createClient(); await supabase.auth.signOut(); } catch { /* Always return to a signed-out screen. */ }
  redirect("/login");
}
