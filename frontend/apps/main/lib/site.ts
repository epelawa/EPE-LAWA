/**
 * Public origin of the platform, and the single place the domain is decided.
 *
 * News lives at `/news/` on this same host. Admin lives at `/admin/` on this same host.
 * Every canonical URL, sitemap entry, cookie-free CORS header and Open Graph URL reads from
 * here.
 */
const FALLBACK_SITE_URL = "https://epelawa.vercel.app";

/** Hosts that are safe to index. A preview or staging host is not in this list. */
const PRODUCTION_HOSTS = ["epelawa.ng", "www.epelawa.ng", "epelawa.vercel.app"];

function parseAbsoluteUrl(value: string | undefined): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url;
  } catch {
    return null;
  }
}

const configuredSite = parseAbsoluteUrl(process.env.NEXT_PUBLIC_SITE_URL);

/** Canonical origin without a trailing slash, e.g. `https://epelawa.vercel.app`. */
export const siteUrl: string = configuredSite ? configuredSite.origin : FALLBACK_SITE_URL;

/** Compatibility alias: News routes share the canonical host and live under `/news`. */
export const newsUrl: string = siteUrl;

/** Absolute URL for a path, e.g. `absoluteUrl("/about")`. */
export function absoluteUrl(pathname: string): string {
  return new URL(pathname, siteUrl).toString();
}

export type VerificationTags = { google?: string; yandex?: string; other?: Record<string, string> };

/** Search-console verification tokens; absent variables contribute nothing. */
export function verificationTags(): { tags: VerificationTags; present: boolean } {
  const google = process.env.GOOGLE_SITE_VERIFICATION?.trim() || undefined;
  const yandex = process.env.YANDEX_SITE_VERIFICATION?.trim() || undefined;
  const bing = process.env.BING_SITE_VERIFICATION?.trim() || undefined;
  const tags: VerificationTags = {};
  if (google) tags.google = google;
  if (yandex) tags.yandex = yandex;
  if (bing) tags.other = { "msvalidate.01": bing };
  return { tags, present: Object.keys(tags).length > 0 };
}

/**
 * Indexing gate.
 *
 * 1. `ALLOW_INDEXING` is an explicit override — "true" forces indexing on, "false" forces
 *    it off.
 * 2. Vercel Preview deployments are never indexable by default, even if they inherit the
 *    production canonical URL.
 * 3. With no override, the site is indexable only when the configured origin is production.
 */
export function isIndexingAllowed(): boolean {
  const explicit = process.env.ALLOW_INDEXING;
  if (explicit === "true") return true;
  if (explicit === "false") return false;
  if (process.env.VERCEL_ENV === "preview") return false;
  return PRODUCTION_HOSTS.includes(new URL(siteUrl).hostname);
}
