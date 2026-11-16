import { normalizeExternalNewsCoverUrl } from "./news-cover-url.mjs";
import { selectedNewsCover } from "./news-covers";
import { publicMediaUrl } from "./media";

/** Only pass rows from published_articles. External URLs are loaded by the reader, never fetched by our server. */
export function publishedNewsCover(row: { og_image_key: string | null; cover_url?: string | null; cover_alt?: string | null }) {
  const approved = selectedNewsCover(row.og_image_key);
  if (approved) return { url: approved.url, alt: approved.alt, illustrative: true };
  const stored = publicMediaUrl(row.og_image_key);
  if (stored) return { url: stored, alt: row.cover_alt?.trim() || "", illustrative: false };
  const linked = normalizeExternalNewsCoverUrl(row.cover_url);
  if (linked && row.cover_alt?.trim()) return { url: linked, alt: row.cover_alt.trim(), illustrative: false };
  return null;
}
