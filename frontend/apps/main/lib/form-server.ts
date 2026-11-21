import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";

/** Never trust arbitrary forwarding headers outside Vercel's controlled edge. */
export async function formClientKey(): Promise<string> {
  const secret = process.env.FORM_RATE_SECRET;
  if (process.env.VERCEL !== "1" || !secret || Buffer.byteLength(secret) < 32) throw new Error("form rate limiter unavailable");
  const raw = (await headers()).get("x-vercel-forwarded-for")?.trim() ?? "";
  if (!isIP(raw)) throw new Error("client address unavailable");
  return createHmac("sha256", secret).update(raw.toLowerCase()).digest("hex");
}
/**
 * True when this network may use the named form this hour. In a Vercel deployment
 * this fails closed: if the limiter state cannot be proven, the request is refused,
 * so a misconfigured rate secret cannot silently disable the bot lockout.
 * Local development (no Vercel environment) stays usable.
 */
export async function formRateAllowance(scope: string, perClientLimit = 5): Promise<boolean> {
  try {
    const fingerprint = await formClientKey();
    const db = formAdminClient();
    const { data, error } = await db.rpc("form_rate_limit", {
      p_scope: scope,
      p_fingerprint: fingerprint,
      p_limit: perClientLimit,
    });
    return error ? false : data === true;
  } catch {
    return process.env.VERCEL !== "1";
  }
}

export const formRateLimitedMessage = "Too many attempts from this network this hour. Please wait a while and try again.";

export function formAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("form service unavailable");
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) throw new Error("invalid database URL");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
