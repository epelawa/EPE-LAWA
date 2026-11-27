"use server";

import { cookies, headers } from "next/headers";
import { adminRedirect as redirect } from "./admin-redirect";
import { ACTIVITY_COOKIE } from "./session-policy";
import { readAdminSessionFromCookies, signOutAdminSession } from "./supabase-access";
import { requestMeta, staffIdentity, writeAdminLog } from "../../main/lib/admin-activity";

const ALLOWED_LOGIN_PATHS = new Set(["/login", "/admin/login"]);

/**
 * Ends an idle staff session and returns to the sign-in screen.
 *
 * Only the two known staff login paths are accepted so this action cannot be
 * turned into an open redirect.
 */
export async function signOutStaffSession(loginPath: string, reason: "inactivity" | "signed-out" = "inactivity"): Promise<void> {
  const target = ALLOWED_LOGIN_PATHS.has(loginPath) ? loginPath : "/login";
  const cookieStore = await cookies();
  // Logged before the session is cleared, while the person can still be identified.
  try {
    const session = readAdminSessionFromCookies(cookieStore.getAll().map(({ name, value }) => ({ name, value })));
    const identity = session?.access_token ? await staffIdentity(session.access_token) : null;
    if (identity) {
      await writeAdminLog({
        event: reason === "signed-out" ? "logout" : "session_expired",
        actorId: identity.id,
        actorEmail: identity.email,
        method: "POST",
        path: target,
        reason: reason === "signed-out" ? "Signed out" : "Signed out automatically after inactivity",
      }, requestMeta(await headers()));
    }
  } catch { /* logging is best-effort */ }
  try {
    await signOutAdminSession({
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
  } catch {
    // Clearing cookies can be refused in some render contexts; still leave.
  }
  try {
    cookieStore.delete(ACTIVITY_COOKIE.staff);
  } catch {
    // Ignore cookie-write failures; the redirect below still ends the screen.
  }
  return await redirect(reason === "signed-out" ? target : `${target}?reason=inactivity`);
}

/** The sidebar's Sign out button (logged as a sign-out, not an inactivity timeout). */
export async function signOutStaffManual(): Promise<void> {
  return signOutStaffSession("/admin/login", "signed-out");
}

/** Server-action wrappers so a client guard can be passed a serialisable action. */
export async function signOutStaffSameOrigin(): Promise<void> {
  return signOutStaffSession("/admin/login");
}

export async function signOutStaffStandalone(): Promise<void> {
  return signOutStaffSession("/login");
}
