import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Access token for external schedulers such as cron-job.org (owner request,
 * November 2026: "show the secret on the Cron page so I can copy it into the
 * cron job and it authorises").
 *
 * The admin Cron page shows a token derived from the server secret with
 * HMAC-SHA256 and a cron-only label, never the raw secret itself. The token can
 * only call the cron endpoints. CRON_SECRET is the root; when it is not set,
 * FORM_RATE_SECRET is used with the same cron-only label, so the page still
 * works without new Vercel variables. Changing the root secret (or TOKEN_LABEL)
 * retires every copied token at once.
 */

const TOKEN_PREFIX = "epl_cron_v1_";
const TOKEN_LABEL = "epe-lawa/cron-scheduler-token/v1";

function rootSecret(env: NodeJS.ProcessEnv): string | null {
  const cron = env.CRON_SECRET?.trim();
  if (cron && Buffer.byteLength(cron) >= 16) return cron;
  const fallback = env.FORM_RATE_SECRET?.trim();
  if (fallback && Buffer.byteLength(fallback) >= 32) return fallback;
  return null;
}

/** The token to paste into the scheduler, or null when no server secret is configured. */
export function cronAccessToken(env: NodeJS.ProcessEnv = process.env): string | null {
  const secret = rootSecret(env);
  if (!secret) return null;
  return TOKEN_PREFIX + createHmac("sha256", secret).update(TOKEN_LABEL).digest("base64url");
}

function sameValue(presented: string, expected: string): boolean {
  const a = Buffer.from(presented), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Accepts the page token or, for existing setups, the raw CRON_SECRET, sent as
 * `x-cron-secret: <value>` or `Authorization: Bearer <value>`. Constant-time.
 */
export function cronRequestAuthorized(headers: Headers, env: NodeJS.ProcessEnv = process.env): boolean {
  const bearer = headers.get("authorization");
  const presented = (headers.get("x-cron-secret") ?? (bearer?.startsWith("Bearer ") ? bearer.slice(7) : "")).trim();
  if (!presented || presented.length > 512) return false;
  const token = cronAccessToken(env);
  const raw = env.CRON_SECRET?.trim();
  // Evaluate both so timing does not reveal which form matched.
  const tokenMatch = token ? sameValue(presented, token) : false;
  const rawMatch = raw ? sameValue(presented, raw) : false;
  return tokenMatch || rawMatch;
}
