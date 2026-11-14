"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { siteUrl } from "../../lib/site";
import { consumeAuthRateLimit } from "../../lib/auth-rate-limit";
import { handleResendSignupVerification, handleVerifyEmailOtp, type AuthState } from "../../lib/auth-otp";

export type { AuthState } from "../../lib/auth-otp";
const genericError = "We couldn’t complete that request. Check your details and try again.";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function field(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}
function rawField(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}
function validEmail(email: string) { return email.length <= 254 && emailPattern.test(email); }
function authCallbackUrl(nextPath: string): string {
  const url = new URL("/auth/callback", siteUrl);
  url.searchParams.set("next", nextPath);
  return url.toString();
}

export async function signUp(_state: AuthState, data: FormData): Promise<AuthState> {
  const email = field(data, "email").toLowerCase();
  const password = rawField(data, "password");
  const handle = field(data, "handle").toLowerCase();
  const displayName = field(data, "displayName");
  if (!validEmail(email) || password.length < 10 || password.length > 128 || !/^[a-z0-9_]{3,24}$/.test(handle) || displayName.length < 1 || displayName.length > 60) {
    return { status: "error", message: "Check your name, handle, email and password. Passwords must be at least 10 characters." };
  }
  try {
    if (!(await consumeAuthRateLimit("signup", email))) return { status: "error", message: genericError };
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: authCallbackUrl("/auth/complete"),
        data: { handle, display_name: displayName },
      },
    });
    if (error) return { status: "error", message: genericError };
    return { status: "notice", message: "Your account request was received. If verification is required, check for the EPE LAWA confirmation email before signing in." };
  } catch { return { status: "error", message: genericError }; }
}

export async function signIn(_state: AuthState, data: FormData): Promise<AuthState> {
  const email = field(data, "email").toLowerCase();
  const password = rawField(data, "password");
  if (!validEmail(email) || !password || password.length > 128) return { status: "error", message: genericError };
  try {
    if (!(await consumeAuthRateLimit("signin", email))) return { status: "error", message: genericError };
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { status: "error", message: genericError };
    redirect("/dashboard");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { status: "error", message: genericError };
  }
}

export async function requestPasswordReset(_state: AuthState, data: FormData): Promise<AuthState> {
  const email = field(data, "email").toLowerCase();
  if (!validEmail(email)) return { status: "error", message: "Enter a valid email address." };
  try {
    if (!(await consumeAuthRateLimit("recovery", email))) return { status: "notice", message: "If an account exists for that address, password-reset instructions may be sent." };
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: authCallbackUrl("/auth/new-password"),
    });
    return { status: "notice", message: "If an account exists for that address, password-reset instructions may be sent." };
  } catch { return { status: "error", message: genericError }; }
}

export async function resendSignupVerification(_state: AuthState, data: FormData): Promise<AuthState> {
  return handleResendSignupVerification(data, createClient, authCallbackUrl("/auth/complete"), (email) => consumeAuthRateLimit("otp_resend", email));
}

export async function updatePassword(_state: AuthState, data: FormData): Promise<AuthState> {
  const password = rawField(data, "password");
  const returnTo = field(data, "returnTo") === "staff" ? "/admin/login" : "/dashboard";
  if (password.length < 10 || password.length > 128) return { status: "error", message: "Use a password between 10 and 128 characters." };
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.email) return { status: "error", message: "Your recovery session is missing or expired. Request a new password reset." };
    if (!(await consumeAuthRateLimit("recovery", user.email))) return { status: "error", message: genericError };
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { status: "error", message: genericError };
    redirect(returnTo);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { status: "error", message: genericError };
  }
}

export async function verifyEmailOtp(_state: AuthState, data: FormData): Promise<AuthState> {
  const outcome = await handleVerifyEmailOtp(data, createClient, authCallbackUrl("/auth/complete"), (email) => consumeAuthRateLimit("otp_verify", email));
  if ("redirectTo" in outcome) redirect(outcome.redirectTo);
  return outcome;
}

export async function signOut() {
  try { const supabase = await createClient(); await supabase.auth.signOut(); } catch { /* Always return to a signed-out screen. */ }
  redirect("/login");
}
