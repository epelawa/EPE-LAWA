/** Only allow a local return URL after an authentication-code exchange. */
export function safeAuthNext(value: string | null): string {
  const fallback = "/dashboard";
  if (!value || value.length > 2048 || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return fallback;
  // WHATWG URL parsing normalizes input; check the final origin too, rather
  // than trusting the apparent leading slash alone.
  const origin = "https://auth-return.invalid";
  try {
    const parsed = new URL(value, origin);
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    // Dot-segment normalization can produce a path beginning with "//"; a
    // subsequent URL construction would interpret that as a new authority.
    return parsed.origin === origin && new URL(path, origin).origin === origin ? path : fallback;
  } catch {
    return fallback;
  }
}
