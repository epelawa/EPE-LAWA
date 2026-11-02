/**
 * Public origin of the platform, and the single place the domain is decided.
 *
 * The project moved from Vercel to Google Cloud, so nothing may hardcode the old
 * `epelawa.vercel.app` host. Every canonical URL, sitemap entry, cookie-free CORS header
 * and Open Graph URL reads from here.
 */

const FALLBACK_SITE_URL = "https://epelawa.ng";

/** Hosts that are safe to index. A preview or staging host is not in this list. */
const PRODUCTION_HOSTS = ["epelawa.ng", "www.epelawa.ng"];

function parseAbsoluteUrl(value: string | undefined): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url;
  } catch {
    // A malformed environment value must never crash a build or a request.
    return null;
  }
}

const configuredSite = parseAbsoluteUrl(process.env.NEXT_PUBLIC_SITE_URL);

/** Origin without a trailing slash, e.g. `https://epelawa.ng`. */
export const siteUrl: string = configuredSite ? configuredSite.origin : FALLBACK_SITE_URL;

/** Absolute URL for a path, e.g. `absoluteUrl("/about")`. */
export function absoluteUrl(pathname: string): string {
  return new URL(pathname, siteUrl).toString();
}

/**
 * The news publication lives on its own host (`news.epelawa.ng`). It has no destination
 * until the environment supplies one, so callers render "News" as text rather than a link.
 */
export const newsUrl: string | null = (() => {
  const url = parseAbsoluteUrl(process.env.NEXT_PUBLIC_NEWS_URL);
  return url ? url.origin : null;
})();

/**
 * Indexing gate.
 *
 * The old code keyed off `VERCEL_ENV`, which does not exist on Cloud Run. Two rules
 * replace it, and this comment is the record of the choice:
 *
 * 1. `ALLOW_INDEXING` is an explicit override — "true" forces indexing on, "false" forces
 *    it off. It exists so a deliberate staging-indexing decision does not need a code change.
 * 2. With no override, the site is indexable only when the configured origin is the
 *    production host. A preview deploy that forgets to set `NEXT_PUBLIC_SITE_URL` still
 *    resolves to the production origin, so the honest default for this repository is
 *    "indexable", which is also what the public holding page is approved to do.
 */
export function isIndexingAllowed(): boolean {
  const explicit = process.env.ALLOW_INDEXING;
  if (explicit === "true") return true;
  if (explicit === "false") return false;
  return PRODUCTION_HOSTS.includes(new URL(siteUrl).hostname);
}
