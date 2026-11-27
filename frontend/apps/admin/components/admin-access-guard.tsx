import { cookies, headers } from "next/headers";
import { adminRedirect as redirect } from "../lib/admin-redirect";
import { adminLoginHref } from "../lib/admin-path";
import { clearAdminSessionCookies, getAdminAccessForSession } from "../lib/supabase-access";
import { ACTIVITY_COOKIE, STAFF_INACTIVITY_MS, isInactiveSince } from "../lib/session-policy";

export async function AdminAccessGuard({
  children,
  loginPath,
}: Readonly<{ children: React.ReactNode; loginPath: string }>) {
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const access = await getAdminAccessForSession({
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

  if (!access.allowed || !access.userId) {
    if (access.staleSession) {
      clearAdminSessionCookies({
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
      const href = adminLoginHref(loginPath, requestHeaders.get("x-epe-lawa-admin-route"));
      return await redirect(`${href}${href.includes("?") ? "&" : "?"}reason=session_expired`);
    }
    return await redirect(adminLoginHref(loginPath, requestHeaders.get("x-epe-lawa-admin-route")));
  }
  // Staff sessions end after ten hours without recorded activity. The client
  // guard refreshes this first-party stamp; a stale value blocks the page even
  // when the tab was suspended before the guard could run.
  if (isInactiveSince(cookieStore.get(ACTIVITY_COOKIE.staff)?.value, STAFF_INACTIVITY_MS)) {
    return await redirect(`${loginPath}?reason=inactivity`);
  }
  return children;
}
