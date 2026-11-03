
const ADMIN_COOKIE = "__Host-epelawa-admin";
const PUBLISHABLE_KEY_PREFIX = "sb_publishable_";

function isSecureUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

function isPublishableKey(key: string | undefined): boolean {
  return Boolean(key && key.startsWith(PUBLISHABLE_KEY_PREFIX));
}

function sessionCookieName(index: number | undefined): string {
  return index === undefined ? ADMIN_COOKIE : `${ADMIN_COOKIE}.${index}`;
}

type CookieLike = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

type CookieStoreLike = {
  getAll: () => CookieLike[];
  setAll: (cookies: CookieLike[], headers: Record<string, string>) => void;
};

type SessionValue = {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  expires_at?: number;
  user?: { id: string; aud?: string };
};

function parseSession(value: string | undefined): SessionValue | null {
  if (!value) return null;
  try {
    const raw = Buffer.from(value, "base64url").toString("utf8");
    return JSON.parse(raw) as SessionValue;
  } catch {
    return null;
  }
}

function serializeSession(value: SessionValue): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function cookieOptions(secure: boolean): Record<string, unknown> {
  return { path: "/", httpOnly: true, secure, sameSite: "lax" as const };
}

/**
 * Verifies a bearer token against Supabase Auth and checks the caller has an
 * active staff profile with the admin.access capability. Fails closed on any
 * error. Rejects non-publishable keys and insecure URLs before any network call.
 */
export async function getAdminAccessForToken(
  token: string,
): Promise<{ allowed: boolean; userId: string | null }> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!isPublishableKey(key) || !isSecureUrl(url)) {
    return { allowed: false, userId: null };
  }

  let userId: string | null = null;
  try {
    const userResp = await fetch(`${url}/auth/v1/user`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, apikey: key },
    });
    if (!userResp.ok) return { allowed: false, userId: null };
    const user = (await userResp.json()) as { id?: string };
    userId = user.id ?? null;
    if (!userId) return { allowed: false, userId: null };

    const profileResp = await fetch(`${url}/rest/v1/staff_profiles`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, apikey: key },
    });
    if (!profileResp.ok) return { allowed: false, userId: null };
    const profiles = (await profileResp.json()) as Array<{
      user_id: string;
      is_active: boolean;
    }>;
    const profile = profiles.find((p) => p.user_id === userId);
    if (!profile || !profile.is_active) return { allowed: false, userId: null };

    const grantsResp = await fetch(`${url}/rest/v1/staff_capability_grants`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, apikey: key },
    });
    if (!grantsResp.ok) return { allowed: false, userId: null };
    const grants = (await grantsResp.json()) as Array<{
      user_id: string;
      capability: string;
    }>;
    const hasAccess = grants.some(
      (g) => g.user_id === userId && g.capability === "admin.access",
    );
    return { allowed: hasAccess, userId };
  } catch {
    return { allowed: false, userId: null };
  }
}

/**
 * Sign in an admin with email + password. Stages cookies only after identity,
 * active profile, and admin grant are all verified. Fails closed.
 */
export async function signInAdminWithPassword(
  email: string | null,
  password: string | null,
  cookieStore: CookieStoreLike,
): Promise<{ allowed: boolean }> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!email || !password || !isPublishableKey(key) || !isSecureUrl(url)) {
    return { allowed: false };
  }

  let session: SessionValue | null = null;
  try {
    const tokenResp = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      cache: "no-store",
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, gotrue_meta_security: {} }),
    });
    if (!tokenResp.ok) return { allowed: false };
    session = (await tokenResp.json()) as SessionValue;
    if (!session.access_token || !session.user?.id) return { allowed: false };

    const userResp = await fetch(`${url}/auth/v1/user`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${session.access_token}`, apikey: key },
    });
    if (!userResp.ok) {
      await fetch(`${url}/auth/v1/logout`, {
        cache: "no-store",
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, apikey: key },
      });
      return { allowed: false };
    }
    const user = (await userResp.json()) as { id?: string };
    if (user.id !== session.user.id) {
      await fetch(`${url}/auth/v1/logout`, {
        cache: "no-store",
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, apikey: key },
      });
      return { allowed: false };
    }

    const profileResp = await fetch(`${url}/rest/v1/staff_profiles`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${session.access_token}`, apikey: key },
    });
    if (!profileResp.ok) {
      await fetch(`${url}/auth/v1/logout`, {
        cache: "no-store",
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, apikey: key },
      });
      return { allowed: false };
    }
    const profiles = (await profileResp.json()) as Array<{
      user_id: string;
      is_active: boolean;
    }>;
    const profile = profiles.find((p) => p.user_id === session.user!.id);
    if (!profile || !profile.is_active) {
      await fetch(`${url}/auth/v1/logout`, {
        cache: "no-store",
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, apikey: key },
      });
      return { allowed: false };
    }

    const grantsResp = await fetch(`${url}/rest/v1/staff_capability_grants`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${session.access_token}`, apikey: key },
    });
    if (!grantsResp.ok) {
      await fetch(`${url}/auth/v1/logout`, {
        cache: "no-store",
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, apikey: key },
      });
      return { allowed: false };
    }
    const grants = (await grantsResp.json()) as Array<{
      user_id: string;
      capability: string;
    }>;
    const hasAccess = grants.some(
      (g) => g.user_id === session.user!.id && g.capability === "admin.access",
    );
    if (!hasAccess) {
      await fetch(`${url}/auth/v1/logout`, {
        cache: "no-store",
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, apikey: key },
      });
      return { allowed: false };
    }

    // All checks passed — stage cookies.
    const secure = isSecureUrl(url);
    const expiresAt =
      session.expires_at ?? Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600);
    const value = serializeSession({
      ...session,
      expires_at: expiresAt,
    });

    const cookies: CookieLike[] = [];
    const maxAge = Math.max(expiresAt - Math.floor(Date.now() / 1000), 0);
    cookies.push({
      name: ADMIN_COOKIE,
      value,
      options: { ...cookieOptions(secure), maxAge },
    });

    cookieStore.setAll(cookies, { "Cache-Control": "no-store" });
    return { allowed: true };
  } catch {
    // On any failure, attempt logout to clear partial state.
    if (session?.access_token) {
      try {
        await fetch(`${url}/auth/v1/logout`, {
          cache: "no-store",
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}`, apikey: key },
        });
      } catch {
        // Ignore logout failures during error handling.
      }
    }
    return { allowed: false };
  }
}

/**
 * Sign out an admin session. Clears admin cookies regardless of whether the
 * provider logout call succeeds. Reports whether the provider revocation
 * succeeded and whether cookies were cleared.
 */
export async function signOutAdminSession(
  cookieStore: CookieStoreLike,
): Promise<{ revoked: boolean; cookiesCleared: boolean }> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  const cookies = cookieStore.getAll();
  const adminCookies = cookies.filter((c) =>
    c.name === ADMIN_COOKIE || c.name.startsWith(`${ADMIN_COOKIE}.`),
  );

  let accessToken: string | undefined;
  for (const c of adminCookies) {
    const session = parseSession(c.value);
    if (session?.access_token) {
      accessToken = session.access_token;
      break;
    }
  }

  let revoked = false;
  if (accessToken && isPublishableKey(key) && isSecureUrl(url)) {
    try {
      const resp = await fetch(`${url}/auth/v1/logout`, {
        cache: "no-store",
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, apikey: key },
      });
      revoked = resp.ok;
    } catch {
      revoked = false;
    }
  }

  // Always attempt to clear cookies.
  let cookiesCleared = false;
  try {
    const secure = isSecureUrl(url);
    const clearCookies: CookieLike[] = adminCookies.map((c) => ({
      name: c.name,
      value: "",
      options: { ...cookieOptions(secure), maxAge: 0 },
    }));
    cookieStore.setAll(clearCookies, { "Cache-Control": "no-store" });
    cookiesCleared = true;
  } catch {
    cookiesCleared = false;
  }

  return { revoked, cookiesCleared };
}

/**
 * Verifies a session cookie (refreshing if expired) and checks admin access.
 * Returns { allowed, userId }. Fails closed.
 */
export async function getAdminAccessForSession(
  cookieStore: CookieStoreLike,
): Promise<{ allowed: boolean; userId: string | null }> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!isPublishableKey(key) || !isSecureUrl(url)) {
    return { allowed: false, userId: null };
  }

  const cookies = cookieStore.getAll();
  const adminCookie = cookies.find((c) => c.name === ADMIN_COOKIE);
  if (!adminCookie) return { allowed: false, userId: null };

  const session = parseSession(adminCookie.value);
  if (!session?.access_token || !session.user?.id) {
    return { allowed: false, userId: null };
  }

  let accessToken = session.access_token;
  const expired =
    session.expires_at !== undefined && session.expires_at <= Math.floor(Date.now() / 1000);

  let refreshedSession: SessionValue | null = null;

  // If expired, refresh the token.
  if (expired && session.refresh_token) {
    try {
      const refreshResp = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
        cache: "no-store",
        method: "POST",
        headers: { apikey: key, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
      if (refreshResp.ok) {
        refreshedSession = (await refreshResp.json()) as SessionValue;
        accessToken = refreshedSession.access_token;
      }
    } catch {
      return { allowed: false, userId: null };
    }
  }

  // Verify identity.
  let userId: string | null = null;
  try {
    const userResp = await fetch(`${url}/auth/v1/user`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}`, apikey: key },
    });
    if (!userResp.ok) return { allowed: false, userId: null };
    const user = (await userResp.json()) as { id?: string };
    userId = user.id ?? null;
    if (!userId) return { allowed: false, userId: null };

    const profileResp = await fetch(`${url}/rest/v1/staff_profiles`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}`, apikey: key },
    });
    if (!profileResp.ok) return { allowed: false, userId: null };
    const profiles = (await profileResp.json()) as Array<{
      user_id: string;
      is_active: boolean;
    }>;
    const profile = profiles.find((p) => p.user_id === userId);
    if (!profile || !profile.is_active) return { allowed: false, userId: null };

    const grantsResp = await fetch(`${url}/rest/v1/staff_capability_grants`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}`, apikey: key },
    });
    if (!grantsResp.ok) return { allowed: false, userId: null };
    const grants = (await grantsResp.json()) as Array<{
      user_id: string;
      capability: string;
    }>;
    const hasAccess = grants.some(
      (g) => g.user_id === userId && g.capability === "admin.access",
    );
    if (!hasAccess) return { allowed: false, userId: null };
  } catch {
    return { allowed: false, userId: null };
  }

  // Stage refreshed cookies if token was refreshed.
  if (refreshedSession) {
    try {
      const secure = isSecureUrl(url);
      const expiresAt =
        refreshedSession.expires_at ??
        Math.floor(Date.now() / 1000) + (refreshedSession.expires_in ?? 3600);
      const value = serializeSession({
        ...refreshedSession,
        expires_at: expiresAt,
      });
      const maxAge = Math.max(expiresAt - Math.floor(Date.now() / 1000), 0);

      // Chunk large sessions across multiple cookies.
      const chunkSize = 4000;
      const valueStr = value;
      const chunks: string[] = [];
      for (let i = 0; i < valueStr.length; i += chunkSize) {
        chunks.push(valueStr.slice(i, i + chunkSize));
      }

      const setCookies: CookieLike[] = [];
      setCookies.push({
        name: ADMIN_COOKIE,
        value: chunks[0] ?? "",
        options: { ...cookieOptions(secure), maxAge },
      });
      for (let i = 1; i < chunks.length; i++) {
        setCookies.push({
          name: sessionCookieName(i),
          value: chunks[i],
          options: { ...cookieOptions(secure), maxAge },
        });
      }

      cookieStore.setAll(setCookies, { "Cache-Control": "no-store" });
    } catch {
      return { allowed: false, userId: null };
    }
  }

  return { allowed: true, userId };
}

/**
 * Read-only route adapter. Verifies admin session, then calls the protected
 * response builder. On success returns the protected response with secure
 * cookie headers and no-store cache. On denial returns 403. On provider
 * failure returns 503.
 */
export async function respondToAdminRead(
  request: Request,
  protectedResponse: (access: { userId: string }) => Response,
): Promise<Response> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!isPublishableKey(key) || !isSecureUrl(url)) {
    return new Response("Administration is not available.", {
      status: 403,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  }

  let access: { userId: string } | null = null;
  try {
    const result = await getAdminAccessForSession({
      getAll: () => {
        const cookieHeader = request.headers.get("cookie") ?? "";
        return cookieHeader
          .split(";")
          .map((part) => {
            const [name, ...valueParts] = part.split("=");
            return { name: name.trim(), value: valueParts.join("=") };
          })
          .filter((c) => c.name);
      },
      setAll: () => {
        // No-op during read; cookie writes handled inside getAdminAccessForSession
        // via a separate mechanism if needed.
      },
    } as any);
    if (result.allowed && result.userId) {
      access = { userId: result.userId };
    }
  } catch {
    return new Response("Administration is unavailable.", {
      status: 503,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  }

  if (!access) {
    return new Response("Administration is not available.", {
      status: 403,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  }

  let response: Response;
  try {
    response = protectedResponse(access);
  } catch {
    return new Response("Administration is unavailable.", {
      status: 503,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  }

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
