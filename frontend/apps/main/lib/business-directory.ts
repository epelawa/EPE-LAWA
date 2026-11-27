/**
 * Business directory data access and link helpers, shared by the directory, the profile and the cards.
 * Everything reads the public, security-invoker `published_businesses` view, so only published,
 * undeleted listings are ever visible and RLS stays the source of truth.
 * Pure module (no server-only imports) so client components can use the helpers; logo URLs are resolved
 * with lib/media-r2 in server components.
 */

export const DIRECTORY_PAGE_SIZE = 12;

export type BusinessSummary = {
  id: string;
  slug: string;
  name: string;
  category_slug: string;
  category_label: string;
  description: string | null;
  area: string | null;
  address: string | null;
  is_verified: boolean;
  logo_key: string | null;
  published_at: string | null;
};

export const SUMMARY_COLUMNS = "id,slug,name,category_slug,category_label,description,area,address,is_verified,logo_key,published_at";

export type DirectorySort = "verified" | "newest" | "name";
export const SORT_OPTIONS: ReadonlyArray<{ value: DirectorySort; label: string }> = [
  { value: "verified", label: "Verified first" },
  { value: "newest", label: "Recently added" },
  { value: "name", label: "Name A–Z" },
];

export type DirectoryQuery = { q: string; area: string; category: string; verified: boolean; sort: DirectorySort; page: number };

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value.trim().slice(0, 100) : "");

export function parseDirectoryQuery(params: Record<string, string | string[] | undefined>): DirectoryQuery {
  const requested = one(params.page);
  const sort = one(params.sort);
  return {
    q: one(params.q),
    area: one(params.area),
    category: /^[a-z0-9-]{1,60}$/.test(one(params.category)) ? one(params.category) : "",
    verified: one(params.verified) === "1",
    sort: sort === "newest" || sort === "name" ? sort : "verified",
    page: /^\d{1,4}$/.test(requested) ? Math.min(1000, Math.max(1, Number(requested))) : 1,
  };
}

export function directoryHref(query: Partial<DirectoryQuery>): string {
  const p = new URLSearchParams();
  if (query.q) p.set("q", query.q);
  if (query.category) p.set("category", query.category);
  if (query.area) p.set("area", query.area);
  if (query.verified) p.set("verified", "1");
  if (query.sort && query.sort !== "verified") p.set("sort", query.sort);
  if (query.page && query.page > 1) p.set("page", String(query.page));
  const suffix = p.toString();
  return suffix ? `/business-directory?${suffix}` : "/business-directory";
}

/**
 * Reduce free text to characters that are safe inside a PostgREST `or()` filter value: letters (any
 * script, so Yorùbá diacritics survive), digits, spaces, apostrophes, ampersands and hyphens. Commas,
 * dots, colons, parentheses, quotes, `*` and `%` are grammar or wildcards and are dropped.
 */
export function searchTerm(value: string): string {
  return value.normalize("NFC").replace(/[^\p{L}\p{M}\p{N}\s'&-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export const businessHref = (slug: string) => `/business-directory/${encodeURIComponent(slug)}`;

/** Up to two initials for the logo fallback ("Founda Technologies" → "FT"). */
export function businessInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word));
  const letters = words.slice(0, 2).map((word) => Array.from(word.replace(/^[^\p{L}\p{N}]+/u, ""))[0] ?? "");
  return letters.join("").toUpperCase() || "•";
}

/**
 * `wa.me` needs the international number without "+". Nigerian local numbers (0 + 10 digits) become
 * 234…; anything that is not 10–15 digits after that is refused rather than producing a dead link.
 */
export function whatsappHref(raw: string | null): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (/^0\d{10}$/.test(digits)) digits = `234${digits.slice(1)}`;
  return /^\d{10,15}$/.test(digits) ? `https://wa.me/${digits}` : null;
}

/** `tel:` keeps a leading + and digits only; fewer than 7 digits is not a dialable number. */
export function telHref(raw: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/(?!^\+)[^\d]/g, "");
  return cleaned.replace(/\D/g, "").length >= 7 ? `tel:${cleaned}` : null;
}

/** Only absolute http(s) URLs become website buttons. */
export function safeWebsite(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export const websiteLabel = (url: string) => {
  try { return new URL(url).host.replace(/^www\./, ""); } catch { return url; }
};

export function directionsHref(address: string | null, area: string | null): string | null {
  const place = [address, area && !/^online$/i.test(area) ? area : null].filter(Boolean).join(", ");
  return place ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}` : null;
}
