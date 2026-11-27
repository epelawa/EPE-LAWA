"use server";

import { cookies } from "next/headers";
import { adminRedirect as redirect } from "./admin-redirect";
import { safeAdminNextPath } from "./admin-path";
import { ACTIVITY_COOKIE, ACTIVITY_COOKIE_MAX_AGE_SECONDS } from "./session-policy";
import { formRateAllowance, formRateMessage } from "../../main/lib/form-server";
import { signinHumanCheckFailedMessage, verifySigninHumanCheck } from "../../main/lib/human-check";
import { admitSigninAttempt, normaliseSigninEmail, recordSigninOutcome, signinBusyMessage, signinLockedMessage } from "./signin-throttle";
import { signInAdminWithPassword } from "./supabase-access";

export type LoginState = { error?: string };

export async function signInAdmin(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  // One normalised spelling for the lock key AND the password grant, so a
  // respelled address cannot reach the same account with a fresh attempt budget
  // (Strix review on PR #280).
  const email = typeof emailValue === "string" ? normaliseSigninEmail(emailValue) : null;
  const password = typeof passwordValue === "string" ? passwordValue : null;
  // Before admission: nothing between reserving a slot and recording its outcome
  // may throw (signInAdminWithPassword catches internally and reports "unknown").
  const cookieStore = await cookies();
  if (!email || !password) return { error: "Sign-in failed. Check your details or contact an administrator." };
  // Same per-network budget as member sign-in (one shared "auth_signin" scope),
  // checked before anything is written, so one network can neither flood the
  // per-account table nor cheaply re-arm a staff lock (Strix review on PR #280).
  if (!(await formRateAllowance("auth_signin", 15))) return { error: await formRateMessage() };
  // A solved, single-use challenge per password check (Strix review on PR #280).
  if ((await verifySigninHumanCheck(formData)) === "fail") return { error: signinHumanCheckFailedMessage };
  // Per-account lock (shared with member sign-in): a slot is reserved atomically
  // before the password is sent anywhere, and every email string is treated the
  // same way, so it reveals nothing about which addresses are staff accounts.
  const gate = await admitSigninAttempt(email);
  if (!gate.allowed) {
    if (gate.reason === "locked") return { error: signinLockedMessage(gate.retryAfterSeconds, "or reset your password from the member sign-in page") };
    if (gate.reason === "busy") return { error: signinBusyMessage(gate.retryAfterSeconds) };
    return { error: "Sign-in is temporarily unavailable. Please try again in a few minutes." };
  }
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
  // Always close the reserved attempt; "unknown" gives the slot back.
  const lockedFor = await recordSigninOutcome(email, result.password, gate.reservation);
  if (!result.allowed && result.password === "rejected" && lockedFor > 0) {
    return { error: signinLockedMessage(lockedFor, "or reset your password from the member sign-in page") };
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
