/** Server-only, request-scoped Supabase client using only the publishable key
 * and the current user's access token. Authorization is revalidated on every
 * protected request before this client is constructed.
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { adminRedirect as redirect } from "./admin-redirect";
import { getAdminAccessForSession, readAdminSessionFromCookies } from "./supabase-access";

export async function createClient() {
  const cookieStore = await cookies();
  const access = await getAdminAccessForSession({
    getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })),
    setAll: (entries) => {
      for (const entry of entries) {
        cookieStore.set(entry.name, entry.value, {
          ...(entry.options as Record<string, string | number | boolean | undefined>),
          httpOnly: true, secure: true, sameSite: "lax", path: "/", domain: undefined,
        });
      }
    },
  });
  if (!access.allowed || !access.userId) throw new Error("Unauthorized");
  const session = readAdminSessionFromCookies(
    cookieStore.getAll().map(({ name, value }) => ({ name, value })),
  );
  if (!session?.access_token) throw new Error("Unauthorized");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key?.startsWith("sb_publishable_")) {
    throw new Error("Supabase is unavailable");
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  });
}

/**
 * Workspace-stage client for pages and server actions. An unauthorised or dead
 * staff session never renders an "access denied" or "could not load" panel —
 * it bounces through the login screen to mint a fresh token pair. Callers that
 * must tolerate a missing session (the root shell) keep using createClient.
 */
export type StaffClient = Awaited<ReturnType<typeof createClient>>;

export async function createStaffClient() {
  try {
    return await createClient();
  } catch (error) {
    if (!(error instanceof Error) || error.message !== "Unauthorized") throw error;
    return await redirect("/login?reason=session_expired");
  }
}
