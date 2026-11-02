const FALLBACK_SITE_URL = "https://news.epelawa.ng";
const PRODUCTION_HOSTS = ["news.epelawa.ng", "www.news.epelawa.ng"];

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
export const siteUrl: string = configuredSite ? configuredSite.origin : FALLBACK_SITE_URL;
export function absoluteUrl(pathname: string): string {
  return new URL(pathname, siteUrl).toString();
}

export const platformUrl: string | null = (() => {
  const url = parseAbsoluteUrl(process.env.NEXT_PUBLIC_PLATFORM_URL);
  return url ? url.origin : null;
})();

export function isIndexingAllowed(): boolean {
  const explicit = process.env.ALLOW_INDEXING;
  if (explicit === "true") return true;
  if (explicit === "false") return false;
  return PRODUCTION_HOSTS.includes(new URL(siteUrl).hostname);
}
