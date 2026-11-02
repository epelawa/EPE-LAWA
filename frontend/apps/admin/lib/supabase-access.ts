import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server.js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
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

const ADMIN_COOKIE = "__Host-epelawa-admin";

/** The response writer must write all cookies AND all headers to the same response. */
export type SessionCookieStore = {
  getAll(): { name: string; value: string }[];
  setAll(cookies: { name: string; value: string; options: CookieOptions }[], headers: Record<string, string>): void;
};

function publicProviderConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !isPublicKey(key)) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") return null;
    return { url: parsed.origin, key };
  } catch {
    return null;
  }
}

async function hasActiveAdminGrant(client: SupabaseClient, userId: string): Promise<boolean> {
  const profile = await client.from("staff_profiles")
    .select("user_id,is_active").eq("user_id", userId).maybeSingle();
  if (profile.error || !profile.data || profile.data.user_id !== userId || profile.data.is_active !== true) return false;
  const grant = await client.from("staff_capability_grants")
    .select("user_id,capability").eq("user_id", userId).eq("capability", "admin.access").maybeSingle();
  return !grant.error && grant.data?.user_id === userId && grant.data.capability === "admin.access";
}

/**
 * Unwired session gate, NOT a login implementation. The caller must create a fresh
 * cookie store per request, return its cookie/header writes on the same response,
 * and set Cache-Control: no-store on every response, even without a cookie write.
 * Only a verified Auth user plus a current RLS-scoped entry grant is allowed.
 * Never share the client or store across requests or call this from a browser.
 */
export async function getAdminAccessForSession(store: SessionCookieStore): Promise<AdminAccess> {
  const config = publicProviderConfig();
  if (!config) return { allowed: false };
  try {
    let cookieWriteFailed = false;
    const client = createServerClient(config.url, config.key, {
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
      cookieOptions: { name: ADMIN_COOKIE, path: "/", httpOnly: true, secure: true, sameSite: "lax" },
      cookies: {
        getAll: () => store.getAll(),
        setAll: (cookies, headers) => {
          if (cookies.some(({ name }) => name !== ADMIN_COOKIE && !/^__Host-epelawa-admin\.\d+$/.test(name))) {
            cookieWriteFailed = true;
            return;
          }
          const safe = cookies.map(({ name, value, options }) => {
            const { domain: _domain, ...rest } = options;
            return { name, value, options: { ...rest, path: "/", httpOnly: true, secure: true, sameSite: "lax" as const } };
          });
          try {
            store.setAll(safe, { ...headers, "Cache-Control": "private, no-store, max-age=0" });
          } catch {
            // The auth library can dispatch cookie writes to async subscribers;
            // throwing here can create unhandled rejections. Record a failure
            // and deny this request instead.
            cookieWriteFailed = true;
          }
        },
      },
    });
    // getUser verifies with Auth; cookie contents and getSession are not proof of identity.
    const { data, error } = await client.auth.getUser();
    if (cookieWriteFailed || error || !data.user || typeof data.user.id !== "string" || !data.user.id) return { allowed: false };
    const granted = await hasActiveAdminGrant(client, data.user.id);
    return granted && !cookieWriteFailed ? { allowed: true, userId: data.user.id } : { allowed: false };
  } catch {
    return { allowed: false };
  }
}

/**
 * Verify with Supabase Auth, then check the active profile and explicit entry grant
 * through the caller's RLS-scoped identity. No service-role credential is used.
 * This helper is not wired to a login or dashboard; those remain unavailable.
 */
export async function getAdminAccessForToken(token: string | null | undefined): Promise<AdminAccess> {
  const config = publicProviderConfig();
  if (!token || token.length > 8192 || /\s/.test(token) || !config) return { allowed: false };

  try {
    const client = createClient(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        headers: { Authorization: `Bearer ${token}` },
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
      },
    });
    const provider: StaffAccessProvider = {
      async verifyUser(accessToken) {
        const { data, error } = await client.auth.getUser(accessToken);
        return !error && data.user ? { id: data.user.id } : null;
      },
      async hasActiveAdminGrant(userId) {
        return hasActiveAdminGrant(client, userId);
      },
    };
    return await authorizeAdminAccess(token, provider);
  } catch {
    return { allowed: false };
  }
}

/**
 * Experimental route-handler adapter; not a login, Proxy, or resource guard.
 * The callback builds an authorised READ-ONLY response. It must not perform
 * mutations: cookie-copy failure cannot roll back side effects. A denied request
 * never invokes it. Each call uses fresh responses; never stream/cache/share them.
 * Resource access still requires separate authorisation and RLS-scoped reads.
 * Returned responses must not be replaced or have their security headers removed.
 * This remains unwired pending real-provider, Next.js and browser verification.
 */
export async function respondToAdminRead(
  request: NextRequest,
  onAllowed: (access: Extract<AdminAccess, { allowed: true }>) => NextResponse,
): Promise<NextResponse> {
  const noStore = (response: NextResponse) => {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  };
  const unavailable = () => {
    const response = new NextResponse("Administration is not available yet.", { status: 503 });
    noStore(response);
    return response;
  };
  try {
    // Stage writes on a fresh response while the gate checks identity and grant.
    const staged = new NextResponse();
    noStore(staged);
    const access = await getAdminAccessForSession({
      getAll: () => request.cookies.getAll().map(({ name, value }) => ({ name, value })),
      setAll: (cookies) => {
        for (const { name, value, options } of cookies) staged.cookies.set(name, value, options);
      },
    });
    const response = access.allowed
      ? onAllowed(access)
      : new NextResponse("Administration access denied.", { status: 403 });
    noStore(response);
    for (const cookie of staged.cookies.getAll()) response.cookies.set(cookie);
    return response;
  } catch {
    // Never return an authorised response when headers/cookie propagation fails.
    return unavailable();
  }
}
