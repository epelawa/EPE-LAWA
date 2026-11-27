"use server";

import { cookies } from "next/headers";
import { adminRedirect as redirect } from "./admin-redirect";
import { ACTIVITY_COOKIE } from "./session-policy";
import { signOutAdminSession } from "./supabase-access";

const ALLOWED_LOGIN_PATHS = new Set(["/login", "/admin/login"]);

/**
 * Ends an idle staff session and returns to the sign-in screen.
 *
 * Only the two known staff login paths are accepted so this action cannot be
 * turned into an open redirect.
 */
export async function signOutStaffSession(loginPath: string): Promise<void> {
  const target = ALLOWED_LOGIN_PATHS.has(loginPath) ? loginPath : "/login";
  const cookieStore = await cookies();
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
  return await redirect(`${target}?reason=inactivity`);
}

/** Server-action wrappers so a client guard can be passed a serialisable action. */
export async function signOutStaffSameOrigin(): Promise<void> {
  return signOutStaffSession("/admin/login");
}

export async function signOutStaffStandalone(): Promise<void> {
  return signOutStaffSession("/login");
}
