/** Server-only, request-scoped Supabase client using only the publishable key
 * and the current user's access token. Authorization is revalidated on every
 * protected request before this client is constructed.
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getAdminAccessForSession, readAdminSessionFromCookies } from "./supabase-access";

export async function createClient(options: { allowPasswordChange?: boolean } = {}) {
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
  const client = createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  });
  if (!options.allowPasswordChange) {
    const { data: profile, error } = await client.from("staff_profiles").select("must_change_password").eq("user_id", access.userId).maybeSingle();
    if (error || profile?.must_change_password) throw new Error("Password change required");
  }
  return client;
}
