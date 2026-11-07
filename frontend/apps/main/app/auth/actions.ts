"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase";

export type AuthState = { status: "idle" | "error" | "notice"; message: string };
const genericError = "We couldn’t complete that request. Check your details and try again.";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function field(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}
function validEmail(email: string) { return email.length <= 254 && emailPattern.test(email); }

export async function signUp(_state: AuthState, data: FormData): Promise<AuthState> {
  const email = field(data, "email").toLowerCase();
  const password = field(data, "password");
  const handle = field(data, "handle").toLowerCase();
  const displayName = field(data, "displayName");
  if (!validEmail(email) || password.length < 10 || password.length > 128 || !/^[a-z0-9_]{3,24}$/.test(handle) || displayName.length < 1 || displayName.length > 60) {
    return { status: "error", message: "Check your name, handle, email and password. Passwords must be at least 10 characters." };
  }
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://epelawa.ng"}/auth/callback?next=/auth/complete`,
        data: { handle, display_name: displayName },
      },
    });
    if (error) return { status: "error", message: genericError };
    return { status: "notice", message: "Your account request was received. If email verification is enabled, verify your address using the message from EPE LAWA before signing in. Email delivery depends on your Supabase SMTP configuration." };
  } catch { return { status: "error", message: genericError }; }
}

export async function signIn(_state: AuthState, data: FormData): Promise<AuthState> {
  const email = field(data, "email").toLowerCase();
  const password = field(data, "password");
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
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://epelawa.ng"}/auth/callback?next=/auth/new-password`,
    });
    if (error) return { status: "error", message: genericError };
    return { status: "notice", message: "If an account exists for that address, password-reset instructions will be sent. Delivery requires working SMTP configuration." };
  } catch { return { status: "error", message: genericError }; }
}

export async function updatePassword(_state: AuthState, data: FormData): Promise<AuthState> {
  const password = field(data, "password");
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

export async function signOut() {
  try { const supabase = await createClient(); await supabase.auth.signOut(); } catch { /* Always return to a signed-out screen. */ }
  redirect("/login");
}
