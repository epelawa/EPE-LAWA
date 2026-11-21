import { normalizeExternalNewsCoverUrl } from "./news-cover-url.mjs";

/** Only pass rows from published_articles. External URLs are loaded by the reader, never fetched by our server. */
export function publishedNewsCover(row: { cover_url?: string | null; cover_alt?: string | null }) {
  const linked = normalizeExternalNewsCoverUrl(row.cover_url);
  if (linked && row.cover_alt?.trim()) return { url: linked, alt: row.cover_alt.trim() };
  return null;
}
