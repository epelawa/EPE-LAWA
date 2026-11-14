import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";

// Server-only module: imported by auth/actions.ts server actions, never by a client component.
export type AuthRateLimitFlow = "signup" | "signin" | "otp_verify" | "otp_resend" | "recovery";
type Limit = { max: number; windowSeconds: number };
type Policy = { email: Limit; ip: Limit };

export const authRateLimitPolicies: Record<AuthRateLimitFlow, Policy> = {
  signup: { email: { max: 5, windowSeconds: 3600 }, ip: { max: 20, windowSeconds: 3600 } },
  signin: { email: { max: 10, windowSeconds: 900 }, ip: { max: 60, windowSeconds: 900 } },
  otp_verify: { email: { max: 8, windowSeconds: 900 }, ip: { max: 40, windowSeconds: 900 } },
  otp_resend: { email: { max: 3, windowSeconds: 3600 }, ip: { max: 15, windowSeconds: 3600 } },
  recovery: { email: { max: 4, windowSeconds: 3600 }, ip: { max: 15, windowSeconds: 3600 } },
};

/**
 * Vercel supplies the public client IP in x-real-ip and overwrites its
 * x-forwarded-for header to prevent IP spoofing. Do not fall back to a
 * caller-supplied X-Forwarded-For value if the trusted header is absent.
 * https://vercel.com/docs/headers/request-headers
 */
export function getTrustedClientIp(requestHeaders: Pick<Headers, "get">): string | null {
  const candidate = requestHeaders.get("x-real-ip")?.trim() ?? "";
  if (!candidate || candidate.length > 64 || isIP(candidate) === 0) return null;
  return candidate;
}

function digest(kind: "email" | "ip", value: string, key: string): string {
  return createHmac("sha256", key).update(`${kind}:${value}`).digest("hex");
}

/** Exported as a pure helper so tests can assert no raw email/IP reaches the RPC. */
export function buildAuthRateLimitRpcArgs(
  flow: AuthRateLimitFlow,
  email: string,
  ip: string | null,
  serviceRoleKey: string,
) {
  const policy = authRateLimitPolicies[flow];
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || normalizedEmail.length > 254 || !serviceRoleKey) {
    throw new Error("Auth limiter input is not configured.");
  }
  return {
    p_email_hash: digest("email", normalizedEmail, serviceRoleKey),
    p_ip_hash: ip ? digest("ip", ip, serviceRoleKey) : null,
    p_flow: flow,
    p_email_limit: policy.email.max,
    p_email_window_seconds: policy.email.windowSeconds,
    p_ip_limit: policy.ip.max,
    p_ip_window_seconds: policy.ip.windowSeconds,
  };
}

export async function consumeAuthRateLimit(flow: AuthRateLimitFlow, email: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("auth_rate_limit_unavailable", { flow, reason: "server_configuration_missing" });
    throw new Error("Persistent auth limiter is not configured.");
  }

  const requestHeaders = await headers();
  const ip = getTrustedClientIp(requestHeaders);
  const args = buildAuthRateLimitRpcArgs(flow, email, ip, serviceKey);
  const client = createSupabaseClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await client.rpc("consume_auth_rate_limit", args);
  if (error || typeof data !== "boolean") {
    console.error("auth_rate_limit_unavailable", { flow, reason: "rpc_failed", code: error?.code ?? "unknown" });
    throw new Error("Persistent auth limiter is unavailable.");
  }
  return data;
}
