import { normalizeExternalNewsCoverUrl } from "./news-cover-url.mjs";

/**
 * Only pass rows from published_articles. Readers load external covers directly;
 * the server fetches one only in /news/[slug]/cover (the story's own cover, for
 * the Share button, image types only, 8 MB cap).
 */
export function publishedNewsCover(row: { cover_url?: string | null; cover_alt?: string | null }) {
  const linked = normalizeExternalNewsCoverUrl(row.cover_url);
  if (linked && row.cover_alt?.trim()) return { url: linked, alt: row.cover_alt.trim() };
  return null;
}
