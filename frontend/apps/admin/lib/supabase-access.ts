import "server-only";
import { createClient } from "@supabase/supabase-js";
import { authorizeAdminAccess, type AdminAccess, type StaffAccessProvider } from "@epelawa/auth";

/** Only public/publishable keys are accepted; service-role and secret keys are rejected. */
function isPublicKey(key: string): boolean {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;
  try {
    const parts = key.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return payload?.role === "anon";
  } catch {
    return false;
  }
}

/**
 * Verify with Supabase Auth, then check the active profile and explicit entry grant
 * through the caller's RLS-scoped identity. No service-role credential is used.
 * This helper is not wired to a login or dashboard; those remain unavailable.
 */
export async function getAdminAccessForToken(token: string | null | undefined): Promise<AdminAccess> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!token || token.length > 8192 || /\s/.test(token) || !url || !key || !isPublicKey(key)) {
    return { allowed: false };
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") {
      return { allowed: false };
    }
    const client = createClient(parsed.origin, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const provider: StaffAccessProvider = {
      async verifyUser(accessToken) {
        const { data, error } = await client.auth.getUser(accessToken);
        return !error && data.user ? { id: data.user.id } : null;
      },
      async hasActiveAdminGrant(userId) {
        const profile = await client.from("staff_profiles")
          .select("user_id,is_active").eq("user_id", userId).maybeSingle();
        if (profile.error || !profile.data || profile.data.user_id !== userId || profile.data.is_active !== true) return false;
        const grant = await client.from("staff_capability_grants")
          .select("user_id,capability").eq("user_id", userId).eq("capability", "admin.access").maybeSingle();
        return !grant.error && grant.data?.user_id === userId && grant.data.capability === "admin.access";
      },
    };
    return await authorizeAdminAccess(token, provider);
  } catch {
    return { allowed: false };
  }
}
