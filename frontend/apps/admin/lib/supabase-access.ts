
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

const SESSION_COOKIE_CHUNK_SIZE = 4000;
const MAX_SESSION_COOKIE_CHUNKS = 8;

type CookieLike = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

type CookieStoreLike = {
  getAll: () => CookieLike[];
  setAll: (cookies: CookieLike[], headers: Record<string, string>) => void;
};

export type AdminSessionValue = {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  expires_at?: number;
  user?: { id: string; aud?: string };
};

function parseSession(value: string | undefined): AdminSessionValue | null {
  if (!value) return null;
  try {
    const encoded = value.startsWith("base64-") ? value.slice("base64-".length) : value;
    if (!encoded || !/^[A-Za-z0-9_-]+$/.test(encoded)) return null;
    const parsed: unknown = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const candidate = parsed as Partial<AdminSessionValue>;
    if (typeof candidate.access_token !== "string" || !candidate.access_token) return null;
    if (candidate.user !== undefined &&
        (!candidate.user || typeof candidate.user !== "object" || Array.isArray(candidate.user) ||
         typeof candidate.user.id !== "string")) return null;
    return candidate as AdminSessionValue;
  } catch {
    return null;
  }
}

function serializeSession(value: AdminSessionValue): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

/** Read the host-only session cookie, joining numbered chunks when needed. */
export function readAdminSessionFromCookies(
  cookies: readonly { name: string; value: string }[],
): AdminSessionValue | null {
  const baseCookies = cookies.filter((cookie) => cookie.name === ADMIN_COOKIE);
  if (baseCookies.length !== 1) return null;

  const baseValue = baseCookies[0]?.value;
  if (!baseValue) return null;

  // A valid base cookie is complete; ignore and let the next write clean stale chunks.
  const baseSession = parseSession(baseValue);
  if (baseSession) return baseSession;

  const prefix = `${ADMIN_COOKIE}.`;
  const chunks = new Map<number, string>();
  for (const cookie of cookies) {
    if (!cookie.name.startsWith(prefix)) continue;
    const suffix = cookie.name.slice(prefix.length);
    if (!/^[1-9]\d*$/.test(suffix)) return null;
    const index = Number(suffix);
    if (!Number.isSafeInteger(index) || index >= MAX_SESSION_COOKIE_CHUNKS || chunks.has(index)) {
      return null;
    }
    chunks.set(index, cookie.value);
  }

  if (chunks.size === 0) return null;
  const lastIndex = Math.max(...chunks.keys());
  if (chunks.size !== lastIndex) return null;

  const value = [baseValue];
  for (let index = 1; index <= lastIndex; index += 1) {
    const chunk = chunks.get(index);
    if (chunk === undefined) return null;
    value.push(chunk);
  }
  return parseSession(value.join(""));
}

function cookieOptions(secure: boolean): Record<string, unknown> {
  return { path: "/", httpOnly: true, secure, sameSite: "lax" as const };
}

function sessionCookieEntries(
  value: string,
  maxAge: number,
  secure: boolean,
  existingCookies: readonly CookieLike[],
): CookieLike[] | null {
  if (!value) return null;
  const chunks: string[] = [];
  for (let offset = 0; offset < value.length; offset += SESSION_COOKIE_CHUNK_SIZE) {
    chunks.push(value.slice(offset, offset + SESSION_COOKIE_CHUNK_SIZE));
  }
  if (chunks.length === 0 || chunks.length > MAX_SESSION_COOKIE_CHUNKS) return null;

  const entries = chunks.map((chunk, index) => ({
    name: sessionCookieName(index === 0 ? undefined : index),
    value: chunk,
    options: { ...cookieOptions(secure), maxAge },
  }));
  const activeNames = new Set(entries.map((entry) => entry.name));
  const staleNames = new Set(
    existingCookies
      .map((cookie) => cookie.name)
      .filter((name) => name.startsWith(`${ADMIN_COOKIE}.`) && !activeNames.has(name)),
  );
  for (const name of staleNames) {
    entries.push({
      name,
      value: "",
      options: { ...cookieOptions(secure), maxAge: 0 },
    });
  }
  return entries;
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
  if (!url || !key) return { allowed: false, userId: null };

  let userId: string | null = null;
  try {
    const userResp = await fetch(`${url}/auth/v1/user`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, apikey: key },
    });
    if (!userResp.ok) return { allowed: false, userId: null };
    const user = (await userResp.json()) as { id?: string; email_confirmed_at?: string | null };
    userId = user.id ?? null;
    if (!userId || typeof user.email_confirmed_at !== "string" || !user.email_confirmed_at) {
      return { allowed: false, userId: null };
    }

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

    const capabilityResp = await fetch(`${url}/rest/v1/rpc/has_capability`, {
      cache: "no-store",
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ p_capability: "admin.access" }),
    });
    if (!capabilityResp.ok) return { allowed: false, userId: null };
    const hasAccess = (await capabilityResp.json()) === true;
    return { allowed: hasAccess, userId };
  } catch {
    return { allowed: false, userId: null };
  }
}

/**
 * `password` says what the provider decided about the password itself, for the
 * per-account sign-in throttle: "rejected" (wrong email/password), "verified"
 * (a session was issued, whatever the later staff checks decide) or "unknown"
 * (outage, provider rate limit, invalid input — nothing to count).
 */
export type AdminSignInResult = { allowed: boolean; password: "rejected" | "verified" | "unknown" };

/**
 * Sign in an admin with email + password. Stages cookies only after identity,
 * active profile, and admin grant are all verified. Fails closed.
 */
export async function signInAdminWithPassword(
  email: string | null,
  password: string | null,
  cookieStore: CookieStoreLike,
): Promise<AdminSignInResult> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  let verified = false;
  const denied = (): AdminSignInResult => ({ allowed: false, password: verified ? "verified" : "unknown" });

  const normalizedEmail = typeof email === "string" ? email.trim() : "";
  const validEmail = normalizedEmail.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  if (!validEmail || typeof password !== "string" || password.length === 0 || password.length > 1024 ||
      !isPublishableKey(key) || !isSecureUrl(url)) {
    return denied();
  }
  if (!url || !key) return denied();

  let session: AdminSessionValue | null = null;
  try {
    const tokenResp = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      cache: "no-store",
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail, password, gotrue_meta_security: {} }),
    });
    if (!tokenResp.ok) {
      let errorCode: unknown;
      try { errorCode = ((await tokenResp.json()) as { error_code?: unknown }).error_code; } catch { errorCode = undefined; }
      return { allowed: false, password: errorCode === "invalid_credentials" ? "rejected" : "unknown" };
    }
    session = (await tokenResp.json()) as AdminSessionValue;
    verified = true;
    const sessionUserId = session.user?.id;
    const accessToken = session.access_token;
    if (typeof accessToken !== "string" || !accessToken || typeof sessionUserId !== "string" || !sessionUserId) return denied();

    const userResp = await fetch(`${url}/auth/v1/user`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}`, apikey: key },
    });
    if (!userResp.ok) {
      await fetch(`${url}/auth/v1/logout`, {
        cache: "no-store",
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, apikey: key },
      });
      return denied();
    }
    const user = (await userResp.json()) as { id?: string; email_confirmed_at?: string | null };
    if (user.id !== sessionUserId || typeof user.email_confirmed_at !== "string" || !user.email_confirmed_at) {
      await fetch(`${url}/auth/v1/logout`, {
        cache: "no-store",
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, apikey: key },
      });
      return denied();
    }

    const profileResp = await fetch(`${url}/rest/v1/staff_profiles`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}`, apikey: key },
    });
    if (!profileResp.ok) {
      await fetch(`${url}/auth/v1/logout`, {
        cache: "no-store",
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, apikey: key },
      });
      return denied();
    }
    const profiles = (await profileResp.json()) as Array<{
      user_id: string;
      is_active: boolean;
    }>;
    const profile = profiles.find((p) => p.user_id === sessionUserId);
    if (!profile || !profile.is_active) {
      await fetch(`${url}/auth/v1/logout`, {
        cache: "no-store",
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, apikey: key },
      });
      return denied();
    }

    const capabilityResp = await fetch(`${url}/rest/v1/rpc/has_capability`, {
      cache: "no-store",
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ p_capability: "admin.access" }),
    });
    if (!capabilityResp.ok) {
      await fetch(`${url}/auth/v1/logout`, { cache: "no-store", method: "POST", headers: { Authorization: `Bearer ${accessToken}`, apikey: key } });
      return denied();
    }
    const hasAccess = (await capabilityResp.json()) === true;
    if (!hasAccess) {
      await fetch(`${url}/auth/v1/logout`, {
        cache: "no-store",
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, apikey: key },
      });
      return denied();
    }

    // All checks passed — stage cookies.
    const secure = isSecureUrl(url);
    const expiresAt =
      session.expires_at ?? Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600);
    const value = serializeSession({
      ...session,
      expires_at: expiresAt,
    });

    const maxAge = Math.max(expiresAt - Math.floor(Date.now() / 1000), 0);
    const cookieEntries = sessionCookieEntries(value, maxAge, secure, cookieStore.getAll());
    if (!cookieEntries) throw new Error("Admin session cookie payload is too large");
    cookieStore.setAll(cookieEntries, { "Cache-Control": "no-store" });
    return { allowed: true, password: "verified" };
  } catch {
    // On any failure, attempt logout to clear partial state.
    if (session?.access_token && url && key) {
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
    return denied();
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

  const accessToken = readAdminSessionFromCookies(cookies)?.access_token;

  let revoked = false;
  if (accessToken && isPublishableKey(key) && isSecureUrl(url) && url && key) {
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
): Promise<{ allowed: boolean; userId: string | null; staleSession?: boolean }> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!isPublishableKey(key) || !isSecureUrl(url)) {
    return { allowed: false, userId: null };
  }
  if (!url || !key) return { allowed: false, userId: null };

  const cookies = cookieStore.getAll();
  const session = readAdminSessionFromCookies(cookies);
  if (!session?.access_token || !session.user?.id) {
    return { allowed: false, userId: null };
  }

  let accessToken = session.access_token;
  const expired =
    session.expires_at !== undefined && session.expires_at <= Math.floor(Date.now() / 1000);

  let refreshedSession: AdminSessionValue | null = null;

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
        refreshedSession = (await refreshResp.json()) as AdminSessionValue;
        if (typeof refreshedSession.access_token !== "string" || !refreshedSession.access_token) {
          return { allowed: false, userId: null };
        }
        accessToken = refreshedSession.access_token;
      }
    } catch {
      return { allowed: false, userId: null };
    }
  }

  // Verify identity. A 403 session_not_found means the auth server no longer
  // holds this browser's session record (server-side sign-out or a wiped
  // session table). The bearer header alone cannot be re-honoured without
  // credentials, so attempt one refresh and, when that fails, report the
  // session as stale so the guard can clear the dead cookie and bounce the
  // staff member through the login flow to mint a fresh token pair.
  const readStaleCode = (resp: Response): boolean => {
    const header = resp.headers.get("x-sb-error-code");
    if (header) return /session.*not.*found/i.test(header);
    return false;
  };

  let userId: string | null = null;
  try {
    let userResp = await fetch(`${url}/auth/v1/user`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}`, apikey: key },
    });
    let maybeStale = !userResp.ok && (readStaleCode(userResp) || userResp.status === 403);
    if (!userResp.ok && maybeStale && session.refresh_token) {
      try {
        const recoveryResp = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
          cache: "no-store",
          method: "POST",
          headers: { apikey: key, "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: session.refresh_token }),
        });
        if (recoveryResp.ok) {
          const recovered = (await recoveryResp.json()) as AdminSessionValue;
          if (typeof recovered.access_token === "string" && recovered.access_token) {
            accessToken = recovered.access_token;
            refreshedSession = { ...recovered, expires_at: recovered.expires_at ?? Math.floor(Date.now() / 1000) + (recovered.expires_in ?? 3600) };
            userResp = await fetch(`${url}/auth/v1/user`, {
              cache: "no-store",
              headers: { Authorization: `Bearer ${accessToken}`, apikey: key },
            });
            maybeStale = false;
          }
        }
      } catch {
        // Recovery refresh failed; fall through with maybeStale intact.
      }
    }
    if (!userResp.ok) return maybeStale ? { allowed: false, userId: null, staleSession: true } : { allowed: false, userId: null };
    const user = (await userResp.json()) as { id?: string; email_confirmed_at?: string | null };
    userId = user.id ?? null;
    if (!userId || typeof user.email_confirmed_at !== "string" || !user.email_confirmed_at) {
      return { allowed: false, userId: null };
    }

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

    const capabilityResp = await fetch(`${url}/rest/v1/rpc/has_capability`, {
      cache: "no-store",
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ p_capability: "admin.access" }),
    });
    if (!capabilityResp.ok) return { allowed: false, userId: null };
    const hasAccess = (await capabilityResp.json()) === true;
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

      const setCookies = sessionCookieEntries(value, maxAge, secure, cookieStore.getAll());
      if (!setCookies) return { allowed: false, userId: null };
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
/**
 * After getAdminAccessForSession reports a stale session the dead browser
 * cookie must be invalidated here, client-side independent: only the response
 * headers can set cookies during a redirect render.
 */
export function clearAdminSessionCookies(
  cookieStore: CookieStoreLike,
): void {
  const secure = isSecureUrl(process.env.SUPABASE_URL);
  for (const cookie of cookieStore.getAll()) {
    if (cookie.name === ADMIN_COOKIE || cookie.name.startsWith(`${ADMIN_COOKIE}.`)) {
      cookieStore.setAll([{ name: cookie.name, value: "", options: { ...cookieOptions(secure), maxAge: 0 } }], { "Cache-Control": "no-store" });
    }
  }
}

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
  if (!url || !key) return new Response("Administration is not available.", {
    status: 403,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });

  const { NextResponse } = await import("next/server.js");
  const cookieHeader = request.headers.get("cookie") ?? "";
  let stagedCookies: CookieLike[] = cookieHeader
    .split(";")
    .map((part) => {
      const [name] = part.split("=");
      return name.trim();
    })
    .filter((name) => name === ADMIN_COOKIE || name.startsWith(`${ADMIN_COOKIE}.`))
    .map((name) => ({
      name,
      value: "",
      options: { ...cookieOptions(true), maxAge: 0 },
    }));

  const finalize = (response: Response): Response => {
    const nextResponse = response instanceof NextResponse
      ? response
      : new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    nextResponse.headers.set("Cache-Control", "private, no-store, max-age=0");
    nextResponse.headers.set("Pragma", "no-cache");
    nextResponse.headers.set("Expires", "0");
    for (const cookie of stagedCookies) {
      nextResponse.cookies.set(
        cookie.name,
        cookie.value,
        cookie.options as Parameters<typeof nextResponse.cookies.set>[2],
      );
    }
    return nextResponse;
  };

  let access: { userId: string } | null = null;
  try {
    const result = await getAdminAccessForSession({
      getAll: () => cookieHeader.split(";").map((part) => {
        const [name, ...valueParts] = part.split("=");
        return { name: name.trim(), value: valueParts.join("=") };
      }).filter((cookie) => cookie.name),
      setAll: (cookies) => {
        stagedCookies = cookies;
      },
    });
    if (result.allowed && result.userId) {
      access = { userId: result.userId };
    }
  } catch {
    return finalize(new Response("Administration is unavailable.", {
      status: 503,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    }));
  }

  if (!access) {
    return finalize(new Response("Administration is not available.", {
      status: 403,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    }));
  }

  try {
    return finalize(protectedResponse(access));
  } catch {
    return finalize(new Response("Administration is unavailable.", {
      status: 503,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    }));
  }
}
