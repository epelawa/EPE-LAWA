/** Server-only, request-scoped Supabase client using only the publishable key
 * and the current user's access token. Authorization is revalidated on every
 * protected request before this client is constructed.
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getAdminAccessForSession } from "./supabase-access";

const ADMIN_COOKIE = "__Host-epelawa-admin";

type SessionCookie = { access_token?: unknown };

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
  const value = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!value) throw new Error("Unauthorized");
  let session: SessionCookie;
  try {
    const encoded = value.startsWith("base64-") ? value.slice(7) : value;
    session = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionCookie;
  } catch {
    throw new Error("Unauthorized");
  }
  if (typeof session.access_token !== "string" || !session.access_token) {
    throw new Error("Unauthorized");
  }
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
