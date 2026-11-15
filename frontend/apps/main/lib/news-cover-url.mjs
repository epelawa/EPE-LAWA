const RESERVED_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".lan",
  ".test",
  ".invalid",
  ".example",
];

const APPROVED_IMAGE_HOSTS = new Set([
  "images.unsplash.com",
  "images.pexels.com",
  "cdn.pixabay.com",
  "upload.wikimedia.org",
]);

function normalizePublicHttpsUrl(value) {
  if (typeof value !== "string") return null;
  const input = value.trim();
  if (!input || input.length > 2048 || /[\u0000-\u0020\u007f\\]/.test(input)) return null;

  let url;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return null;
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || hostname.includes(":") || !hostname.includes(".")) return null;
  if (RESERVED_HOST_SUFFIXES.some((suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix))) return null;
  if (/^\d+(?:\.\d+){0,3}$/.test(hostname)) return null;
  if (!/^[a-z0-9.-]+$/.test(hostname) || hostname.split(".").some((part) => !part || part.length > 63 || part.startsWith("-") || part.endsWith("-"))) return null;

  const tld = hostname.split(".").at(-1) ?? "";
  if (!/^(?:[a-z]{2,63}|xn--[a-z0-9-]{4,59})$/.test(tld)) return null;
  url.hostname = hostname;
  return url.href;
}

/** Normalize a cover image URL from one explicitly approved public provider; never fetch it server-side. */
export function normalizeExternalNewsCoverUrl(value) {
  const normalized = normalizePublicHttpsUrl(value);
  if (!normalized) return null;
  return APPROVED_IMAGE_HOSTS.has(new URL(normalized).hostname) ? normalized : null;
}

/** Normalize a clickable source or license page URL without fetching it server-side. */
export function normalizeExternalNewsAttributionUrl(value) {
  return normalizePublicHttpsUrl(value);
}
