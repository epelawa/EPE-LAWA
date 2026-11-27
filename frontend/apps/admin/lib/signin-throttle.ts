// Server-side only: imported from "use server" actions; node:crypto cannot be
// bundled for the browser and SUPABASE_SERVICE_ROLE_KEY is never exposed to it.
// (No `import "server-only"`: the package is not resolvable from this workspace
// under the node test runner.)
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

/**
 * Per-account sign-in throttle, shared by the member sign-in (main app) and the
 * staff sign-in (admin login action, also rendered by the main app).
 *
 * The network limiter (form_rate_limit 'auth_signin') stops one network
 * guessing; this stops many networks guessing ONE account. Only failed password
 * checks count: 8 within 15 minutes lock that email for 15 minutes. A successful
 * sign-in or a completed password reset clears it. See
 * backend/supabase/migrations/20261129000000_signin_account_throttle.sql.
 *
 * The database only ever sees an HMAC of the normalised email (keyed with
 * FORM_RATE_SECRET), and every email string is throttled the same way whether
 * or not an account exists, so the lock reveals nothing about registration.
 */

export type SigninGate =
  | { allowed: true }
  | { allowed: false; reason: "locked"; retryAfterSeconds: number }
  | { allowed: false; reason: "unavailable" };

const KEY_DOMAIN = "signin-account:v1:";

/** Lower-cased, trimmed email: the same address always maps to the same key. */
export function normaliseSigninEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** HMAC-SHA256 account key, or null when the rate secret is not configured. */
export function signinAccountKey(email: string, secret = process.env.FORM_RATE_SECRET): string | null {
  if (!secret || Buffer.byteLength(secret) < 32) return null;
  return createHmac("sha256", secret).update(KEY_DOMAIN + normaliseSigninEmail(email)).digest("hex");
}

function throttleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  let parsed: URL;
  try { parsed = new URL(url); } catch { return null; }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

/**
 * Local development without a Vercel environment stays usable; in a Vercel
 * deployment a throttle that cannot be checked refuses the sign-in (fail closed),
 * matching formRateAllowance, so a missing secret cannot silently disable it.
 */
function unavailable(): SigninGate {
  return process.env.VERCEL === "1" ? { allowed: false, reason: "unavailable" } : { allowed: true };
}

/** Whether this email may attempt a password sign-in right now. Never counts an attempt. */
export async function signinAccountGate(email: string): Promise<SigninGate> {
  const accountKey = signinAccountKey(email);
  const db = throttleClient();
  if (!accountKey || !db) return unavailable();
  try {
    const { data, error } = await db.rpc("signin_throttle_status", { p_account_key: accountKey });
    if (error || typeof data !== "number") {
      console.error("sign-in throttle status failed", { code: error?.code });
      return unavailable();
    }
    return data > 0 ? { allowed: false, reason: "locked", retryAfterSeconds: data } : { allowed: true };
  } catch {
    return unavailable();
  }
}

/**
 * Records the outcome of one password check. Returns the seconds the email is
 * now locked for (0 when not locked or when recording failed). Best effort: a
 * recording failure never blocks a successful sign-in.
 */
export async function recordSigninOutcome(email: string, succeeded: boolean): Promise<number> {
  const accountKey = signinAccountKey(email);
  const db = throttleClient();
  if (!accountKey || !db) return 0;
  try {
    const { data, error } = await db.rpc("signin_throttle_record", { p_account_key: accountKey, p_succeeded: succeeded });
    if (error || typeof data !== "number") {
      console.error("sign-in throttle record failed", { code: error?.code });
      return 0;
    }
    return data;
  } catch {
    return 0;
  }
}

/** "about 15 minutes" style wording; never shows seconds. */
export function signinRetryWording(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return minutes === 1 ? "about a minute" : `about ${minutes} minutes`;
}

export function signinLockedMessage(seconds: number, resetHint = "or reset your password"): string {
  return `Too many unsuccessful sign-in attempts for this email. Try again in ${signinRetryWording(seconds)}, ${resetHint}.`;
}
