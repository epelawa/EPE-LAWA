import { timingSafeEqual } from "node:crypto";

/** Parse only an exact browser origin, not a path, wildcard, "null", or forwarded host. */
function exactHttpsOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && url.origin === value
      ? value : null;
  } catch {
    return null;
  }
}

/**
 * Browser cookie-authenticated mutations require an explicit HTTPS origin allowlist
 * AND a matching 32-byte base64url CSRF token. Route handlers must obtain the
 * cookie from a Secure, host-only __Host- cookie and the header from the request.
 * This is a primitive: session binding, issuance, rotation and endpoint wiring
 * remain to be designed and tested before any mutation route is enabled.
 */
export function checkBrowserMutation(input: {
  origin: string | null;
  trustedOrigins: readonly string[];
  csrfCookie: string | null;
  csrfHeader: string | null;
}): boolean {
  if (!input.origin || !exactHttpsOrigin(input.origin) ||
      !input.trustedOrigins.some((origin) => exactHttpsOrigin(origin) === input.origin)) return false;
  const { csrfCookie, csrfHeader } = input;
  if (!csrfCookie || !csrfHeader || !/^[A-Za-z0-9_-]{43}$/.test(csrfCookie) || !/^[A-Za-z0-9_-]{43}$/.test(csrfHeader)) return false;
  const cookieBytes = Buffer.from(csrfCookie, "base64url");
  const headerBytes = Buffer.from(csrfHeader, "base64url");
  if (cookieBytes.length !== 32 || headerBytes.length !== 32 ||
      cookieBytes.toString("base64url") !== csrfCookie || headerBytes.toString("base64url") !== csrfHeader) return false;
  return timingSafeEqual(cookieBytes, headerBytes);
}

/**
 * No cross-origin access is permitted unless an exact HTTPS origin is explicitly
 * configured for the particular endpoint. Never reflect an arbitrary Origin,
 * and never combine credentialed CORS with '*'. The caller must additionally
 * validate preflight methods and requested headers for that endpoint and merge
 * Vary with any existing values. CORS is NOT a substitute for CSRF protection.
 */
export function corsHeaders(origin: string | null, allowedOrigins: readonly string[], credentials = false): Record<string, string> {
  const headers: Record<string, string> = { Vary: "Origin" };
  if (!origin || !exactHttpsOrigin(origin) || !allowedOrigins.some((allowed) => exactHttpsOrigin(allowed) === origin)) return headers;
  headers["Access-Control-Allow-Origin"] = origin;
  if (credentials) headers["Access-Control-Allow-Credentials"] = "true";
  return headers;
}
