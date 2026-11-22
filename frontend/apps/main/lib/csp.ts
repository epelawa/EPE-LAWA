const DIRECTIVES = [
  `default-src 'self'`,
  `base-uri 'self'`,
  `object-src 'none'`,
  `frame-ancestors 'none'`,
  `form-action 'self'`,
  `worker-src 'self'`,
  `manifest-src 'self'`,
  `font-src 'self'`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: https:`,
  `media-src 'self' https:`,
  `upgrade-insecure-requests`,
];

/** Turnstile needs script, connect, frame and worker access to its origin. */
function turnstileDirective(name: "script-src" | "connect-src" | "frame-src" | "worker-src", value: string): string {
  if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()) return name === "frame-src" ? "" : value;
  if (name === "script-src") return `${value} https://challenges.cloudflare.com`;
  if (name === "connect-src") return `${value} https://challenges.cloudflare.com`;
  if (name === "worker-src") return `${value} https://challenges.cloudflare.com`;
  return `frame-src https://challenges.cloudflare.com https://www.openstreetmap.org`;
}

function connectOrigins(): string[] {
  const origins = ["'self'"];
  try {
    const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (raw && new URL(raw).protocol === "https:") origins.push(new URL(raw).origin);
  } catch {
    // An unusable Supabase URL must never widen or break the policy.
  }
  return origins;
}

export function newCspNonce(): string {
  return btoa(crypto.randomUUID());
}

export function contentSecurityPolicy(nonce: string | null): string {
  const devEval = process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : "";
  const scriptSrc = nonce ? `'self' 'nonce-${nonce}' 'strict-dynamic'${devEval}` : `'self'${devEval}`;
  let policy = [...DIRECTIVES, `script-src ${turnstileDirective("script-src", scriptSrc)}`, `connect-src ${turnstileDirective("connect-src", connectOrigins().join(" "))}`.trimEnd()];
  const frameSrc = turnstileDirective("frame-src", "");
  if (frameSrc) policy = [...policy, frameSrc];
  return policy.filter(Boolean).join("; ") + ";";
}
