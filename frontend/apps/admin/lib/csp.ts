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
  // The admin sign-in uses Turnstile when a site key is set; it needs its origin for script, connect, frame and worker.
  const turnstile = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ? " https://challenges.cloudflare.com" : "";
  const directives = DIRECTIVES.map((d) => (turnstile && d === `worker-src 'self'` ? `${d}${turnstile}` : d));
  return [...directives, `script-src ${scriptSrc}${turnstile}`, `connect-src ${connectOrigins().join(" ")}${turnstile}`, `frame-src${turnstile} https://www.openstreetmap.org`].join("; ") + ";";
}
