import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";

type RateReason = "" | "limited" | "unavailable";
/**
 * Why the last rate check in this request refused. Keyed by the request's own
 * headers object (Next returns the same instance for the whole request, in
 * server actions and route handlers alike), so it never leaks across requests.
 * React cache() is not used here because it only memoises during RSC renders.
 */
const rateOutcomes = new WeakMap<object, RateReason>();
async function setRateReason(reason: RateReason) {
  try { rateOutcomes.set(await headers(), reason); } catch { /* outside a request */ }
}

/** Never trust arbitrary forwarding headers outside Vercel's controlled edge. */
export async function formClientKey(): Promise<string> {
  const secret = process.env.FORM_RATE_SECRET;
  if (process.env.VERCEL !== "1" || !secret || Buffer.byteLength(secret) < 32) throw new Error("form rate limiter unavailable");
  const raw = (await headers()).get("x-vercel-forwarded-for")?.trim() ?? "";
  if (!isIP(raw)) throw new Error("client address unavailable");
  return createHmac("sha256", secret).update(raw.toLowerCase()).digest("hex");
}
/**
 * Default submissions per network per hour. Many Nigerian mobile users share a
 * carrier IP (CGNAT), and every attempt counts, so 5 was reached by ordinary
 * visitors correcting a form. 12 still stops scripted floods (each scope also has a
 * shared hourly ceiling, see sharedHourlyLimit).
 */
const DEFAULT_PER_NETWORK_LIMIT = 12;

/**
 * Shared (all networks together) ceiling per scope per hour. A refused network adds nothing to the shared row,
 * so filling it takes `ceiling / perNetworkLimit` distinct networks. The database default of 100 let about
 * eight networks lock every visitor out of a form, sign-in or notification settings (Strix review on PR #275),
 * so non-mail scopes now sit far above any realistic legitimate hour. The four auth scopes that send email
 * keep the original 100/hour ceiling as a cost guard for the SMTP quota.
 */
const SHARED_HOURLY_LIMIT: Readonly<Record<string, number>> = {
  auth_signup: 100, auth_reset: 100, auth_resend: 100, auth_otp: 100,
  auth_signin: 5000, auth_password_change: 2000,
  push_subscribe: 5000,
  forum_post: 2000, image_upload: 2000,
};
const DEFAULT_SHARED_HOURLY_LIMIT = 1000;
export function sharedHourlyLimit(scope: string): number {
  return SHARED_HOURLY_LIMIT[scope] ?? DEFAULT_SHARED_HOURLY_LIMIT;
}

/**
 * True when this network may use the named form this hour. In a Vercel deployment
 * this fails closed: if the limiter state cannot be proven, the request is refused,
 * so a misconfigured rate secret cannot silently disable the bot lockout.
 * Local development (no Vercel environment) stays usable.
 */
export async function formRateAllowance(scope: string, perClientLimit = DEFAULT_PER_NETWORK_LIMIT): Promise<boolean> {
  try {
    const fingerprint = await formClientKey();
    const db = formAdminClient();
    const { data, error } = await db.rpc("form_rate_limit", {
      p_scope: scope,
      p_fingerprint: fingerprint,
      p_limit: perClientLimit,
      p_global_limit: sharedHourlyLimit(scope),
    });
    if (error) {
      console.error("form rate limiter error", { scope, code: error.code });
      await setRateReason("unavailable");
      return false;
    }
    await setRateReason(data === true ? "" : "limited");
    return data === true;
  } catch (error) {
    if (process.env.VERCEL !== "1") return true;
    console.error("form rate limiter unavailable", { scope, message: error instanceof Error ? error.message : "unknown" });
    await setRateReason("unavailable");
    return false;
  }
}

export const formRateLimitedMessage = "Too many attempts from this network this hour. Please wait a while and try again.";
export const formRateUnavailableMessage = "This form is temporarily unavailable. Nothing was saved — please try again in a few minutes.";

/** The honest refusal message for the most recent formRateAllowance() in this request. */
export async function formRateMessage(): Promise<string> {
  let reason: RateReason | undefined;
  try { reason = rateOutcomes.get(await headers()); } catch { reason = undefined; }
  return reason === "unavailable" ? formRateUnavailableMessage : formRateLimitedMessage;
}

export function formAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("form service unavailable");
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) throw new Error("invalid database URL");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
