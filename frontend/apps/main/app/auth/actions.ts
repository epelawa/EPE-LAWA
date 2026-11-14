"use server";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { siteUrl } from "../../lib/site";
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
  if (!validEmail(email) || password.length < 10 || password.length > 128 || !isValidHandle(handle) || displayName.length < 1 || displayName.length > 60) {
    return { status: "error", message: "Check your name, handle, email and password. Passwords must be at least 10 characters." };
  }
  const availability = await checkHandleAvailability(handle);
  if (availability === "taken") return { status: "error", message: "That handle is already in use. Choose another handle." };
  if (availability !== "available") return { status: "error", message: "Handle availability could not be checked because account setup is temporarily unavailable. Please try again later." };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: authCallbackUrl("/auth/complete"), data: { handle, display_name: displayName } },
    });
    if (error) return { status: "error", message: genericError };
    return { status: "notice", message: "Your account request was received. If email verification is required, use the code or secure link in the EPE LAWA confirmation email before signing in. Delivery depends on this project’s configured email provider." };
  } catch { return { status: "error", message: genericError }; }
}
export async function signIn(_state: AuthState, data: FormData): Promise<AuthState> {
  const email = field(data, "email").toLowerCase();
  const password = passwordField(data);
  if (!validEmail(email) || !password || password.length > 128) return { status: "error", message: genericError };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { status: "error", message: genericError };
    redirect("/auth/complete");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { status: "error", message: genericError };
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
