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
 * The network limiter (form_rate_limit 'auth_signin', checked first by both
 * actions) stops one network guessing; this stops many networks guessing ONE
 * account. Every password check first reserves a slot atomically
 * (admitSigninAttempt) and gets a reservation token. At most 8 checks per email
 * can be spent or in flight in a 15-minute window; beyond that the attempt is
 * refused as "busy" without starting a lock. Only the 8th provider-confirmed
 * wrong password locks the email for 15 minutes. Every admitted attempt MUST be
 * closed with recordSigninOutcome and its token: "verified" clears the email,
 * "rejected" counts one confirmed failure, "unknown" (outage, provider rate
 * limit) releases the slot. Outcomes with a stale token are ignored. See
 * backend/supabase/migrations/20261129000000_signin_account_throttle.sql and
 * 20261129050000_signin_throttle_slots.sql (each reservation is its own slot,
 * so a late outcome from a released slot can never free a live one).
 *
 * The database only ever sees an HMAC of the normalised email (keyed with
 * FORM_RATE_SECRET), and every email string is throttled the same way whether
 * or not an account exists, so the lock reveals nothing about registration.
 */

export type SigninOutcome = "verified" | "rejected" | "unknown";

export type SigninGate =
  | { allowed: true; reservation: string | null }
  | { allowed: false; reason: "locked" | "busy"; retryAfterSeconds: number }
  | { allowed: false; reason: "unavailable" };

const KEY_DOMAIN = "signin-account:v1:";

/**
 * Lower-cased, trimmed email. Both sign-in actions send exactly this string to
 * the auth provider too, so the lock is keyed on the identifier that is actually
 * authenticated and a respelling (e.g. a capital dotted İ) cannot reach the same
 * account under a fresh attempt budget (Strix review on PR #280).
 */
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
  return process.env.VERCEL === "1" ? { allowed: false, reason: "unavailable" } : { allowed: true, reservation: null };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const seconds = (value: unknown) => (typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null);

/**
 * Reserves one password check for this email, or reports why not. When this
 * returns allowed, the caller must close the attempt with recordSigninOutcome,
 * passing the reservation token (null only in local development without the
 * throttle configured).
 */
export async function admitSigninAttempt(email: string): Promise<SigninGate> {
  const accountKey = signinAccountKey(email);
  const db = throttleClient();
  if (!accountKey || !db) return unavailable();
  try {
    const { data, error } = await db.rpc("signin_throttle_admit", { p_account_key: accountKey });
    const result = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
    if (error) {
      console.error("sign-in throttle admission failed", { code: error.code });
      return unavailable();
    }
    if (result.admitted === true && typeof result.reservation === "string" && UUID.test(result.reservation)) {
      return { allowed: true, reservation: result.reservation };
    }
    const locked = seconds(result.locked);
    if (locked) return { allowed: false, reason: "locked", retryAfterSeconds: locked };
    const busy = seconds(result.busy);
    if (busy) return { allowed: false, reason: "busy", retryAfterSeconds: busy };
    // "capacity" (hourly new-key cap, a flood backstop) or an unexpected reply: fail safe.
    console.error("sign-in throttle refused admission", { capacity: result.capacity === true });
    return unavailable();
  } catch {
    return unavailable();
  }
}

/**
 * Closes one admitted attempt ("rejected" / "unknown" need its reservation), or
 * with "verified" clears the email (after a correct password, a completed reset
 * or a valid emailed code; no reservation needed). Returns the seconds the
 * email is now locked for (0 when not locked or when recording failed). Best
 * effort: a recording failure never blocks a successful sign-in.
 */
export async function recordSigninOutcome(email: string, outcome: SigninOutcome, reservation: string | null = null): Promise<number> {
  const accountKey = signinAccountKey(email);
  const db = throttleClient();
  if (!accountKey || !db) return 0;
  if (outcome !== "verified" && !reservation) return 0;
  try {
    const { data, error } = await db.rpc("signin_throttle_record", { p_account_key: accountKey, p_outcome: outcome, p_reservation: reservation });
    if (error || typeof data !== "number") {
      console.error("sign-in throttle record failed", { code: error?.code });
      return 0;
    }
    return data;
  } catch {
    return 0;
  }
}

/**
 * The reserved way out of a lock (Strix review on PR #280). Called only after
 * the shared site-wide budget for password reset ("reset") or emailed-code
 * checks ("code") has refused: while this address is actually locked, it may
 * still use a small per-address allowance (3 resets / 10 code checks an hour)
 * that the general queue cannot consume. False when the address is not locked,
 * the allowance is spent, or the throttle cannot be reached. See
 * backend/supabase/migrations/20261129060000_signin_lock_exit_lane.sql.
 */
export async function signinLockExitAllowed(email: string, kind: "reset" | "code"): Promise<boolean> {
  const accountKey = signinAccountKey(email);
  const db = throttleClient();
  if (!accountKey || !db) return false;
  try {
    const { data, error } = await db.rpc("signin_throttle_exit_allowance", { p_account_key: accountKey, p_kind: kind });
    if (error) {
      console.error("sign-in lock exit allowance failed", { code: error.code });
      return false;
    }
    return data === true;
  } catch {
    return false;
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

export function signinBusyMessage(seconds: number): string {
  return `Several sign-in attempts for this email are still being checked. Try again in ${signinRetryWording(seconds)}.`;
}
