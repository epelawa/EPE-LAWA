import "server-only";

/**
 * Cloudflare Turnstile verification for anonymous public forms.
 *
 * The feature is opt-in by environment: with no site key and secret nothing
 * changes for the forms. With both set, a form submission without a valid
 * widget response is rejected — verification never silently passes.
 */

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function turnstileSiteKey(): string | null {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null;
}

export type TurnstileVerdict = "off" | "pass" | "fail";

export async function verifyTurnstile(form: FormData): Promise<TurnstileVerdict> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return "off";
  const token = form.get("cf-turnstile-response");
  if (typeof token !== "string" || !token || token.length > 4096) return "fail";
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }).toString(),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return "fail";
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "fail";
    return (payload as { success?: unknown }).success === true ? "pass" : "fail";
  } catch {
    return "fail";
  }
}
