"use server";

import { cookies } from "next/headers";
import { adminRedirect as redirect } from "./admin-redirect";
import { safeAdminNextPath } from "./admin-path";
import { ACTIVITY_COOKIE, ACTIVITY_COOKIE_MAX_AGE_SECONDS } from "./session-policy";
import { recordSigninOutcome, signinAccountGate, signinLockedMessage } from "./signin-throttle";
import { signInAdminWithPassword } from "./supabase-access";

export type LoginState = { error?: string };

export async function signInAdmin(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  const email = typeof emailValue === "string" ? emailValue : null;
  const password = typeof passwordValue === "string" ? passwordValue : null;
  // Per-account lock (shared with member sign-in): checked before the password
  // is sent anywhere, and applied to every email string so it reveals nothing
  // about which addresses are staff accounts.
  if (email && email.trim()) {
    const gate = await signinAccountGate(email);
    if (!gate.allowed) {
      return {
        error: gate.reason === "locked"
          ? signinLockedMessage(gate.retryAfterSeconds, "or reset your password from the member sign-in page")
          : "Sign-in is temporarily unavailable. Please try again in a few minutes.",
      };
    }
  }
  const cookieStore = await cookies();
  const result = await signInAdminWithPassword(email, password, {
    getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })),
    setAll: (entries) => {
      for (const entry of entries) {
        cookieStore.set(entry.name, entry.value, {
          ...(entry.options as Record<string, string | number | boolean | undefined>),
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
          domain: undefined,
        });
      }
    },
  });
  if (email && result.password !== "unknown") {
    const lockedFor = await recordSigninOutcome(email, result.password === "verified");
    if (!result.allowed && lockedFor > 0) {
      return { error: signinLockedMessage(lockedFor, "or reset your password from the member sign-in page") };
    }
  }
  if (!result.allowed) return { error: "Sign-in failed. Check your details or contact an administrator." };

  // Start a fresh staff inactivity window for this sign-in.
  cookieStore.set(ACTIVITY_COOKIE.staff, String(Date.now()), {
    path: "/",
    maxAge: ACTIVITY_COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
  });

  return await redirect(safeAdminNextPath(formData.get("next")));
}
