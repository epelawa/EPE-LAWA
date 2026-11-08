/**
 * Public origin of the platform, and the single place the domain is decided.
 *
 * News lives at `/news/` on this same host. Admin lives at `/admin/` on this same host.
 * Every canonical URL, sitemap entry, cookie-free CORS header and Open Graph URL reads from
 * here.
 */
const FALLBACK_SITE_URL = "https://epelawa.vercel.app";

/** Newsroom host. Kept beside the main origin so one file decides every public host. */
const FALLBACK_NEWS_URL = "https://news.epelawa.ng";

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
const configuredNews = parseAbsoluteUrl(process.env.NEXT_PUBLIC_NEWS_URL);

/** Origin without a trailing slash, e.g. `https://epelawa.ng`. */
export const siteUrl: string = configuredSite ? configuredSite.origin : FALLBACK_SITE_URL;

/**
 * Newsroom origin without a trailing slash. `NEXT_PUBLIC_NEWS_URL` was documented in
 * `.env.example` but nothing read it, so the value in Vercel had no effect until now.
 */
export const newsUrl: string = configuredNews ? configuredNews.origin : FALLBACK_NEWS_URL;

/** Absolute URL for a path, e.g. `absoluteUrl("/about")`. */
export function absoluteUrl(pathname: string): string {
  return new URL(pathname, siteUrl).toString();
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
