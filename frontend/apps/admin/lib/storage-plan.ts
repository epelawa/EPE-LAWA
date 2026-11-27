/**
 * Pure helpers for the Storage desk: reading Cloudflare R2 list pages,
 * grouping objects into site areas for the chart, choosing which files the
 * cleanup may remove, and drawing the pie. No network and no secrets here,
 * so every rule is unit-tested.
 */

export type StoredObject = { key: string; size: number; uploaded: string | null; contentType: string | null };
export type ObjectPage = { state: "ready"; objects: StoredObject[]; cursor: string | null; isTruncated: boolean } | { state: "unavailable" };

/** Only files the site itself uploaded live under this prefix. Backups and anything else are never touched. */
export const MEDIA_PREFIX = "media/";
/** A file uploaded in the last day may belong to a form that is still being filled in. */
export const CLEANUP_GRACE_HOURS = 24;
/** Supabase free plan database allowance and Cloudflare R2 free storage. */
export const SUPABASE_FREE_BYTES = 500 * 1024 * 1024;
export const R2_FREE_BYTES = 10 * 1024 * 1024 * 1024;

export function parseObjectPage(body: unknown): ObjectPage {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { state: "unavailable" };
  const envelope = body as { success?: unknown; result?: unknown; result_info?: unknown };
  if (envelope.success !== true || !Array.isArray(envelope.result)) return { state: "unavailable" };
  const info = (envelope.result_info && typeof envelope.result_info === "object" ? envelope.result_info : {}) as { cursor?: unknown; is_truncated?: unknown };
  const isTruncated = info.is_truncated === true;
  const cursor = typeof info.cursor === "string" && info.cursor ? info.cursor : null;
  if (isTruncated && !cursor) return { state: "unavailable" };
  const objects: StoredObject[] = [];
  for (const raw of envelope.result) {
    if (!raw || typeof raw !== "object") continue;
    const entry = raw as { key?: unknown; size?: unknown; last_modified?: unknown; uploaded?: unknown; http_metadata?: unknown };
    if (typeof entry.key !== "string" || !entry.key || entry.key.length > 1024) continue;
    const size = typeof entry.size === "number" && Number.isSafeInteger(entry.size) && entry.size >= 0 ? entry.size : 0;
    const rawDate = typeof entry.last_modified === "string" ? entry.last_modified : entry.uploaded;
    const uploaded = typeof rawDate === "string" && Number.isFinite(Date.parse(rawDate)) ? rawDate : null;
    const meta = (entry.http_metadata && typeof entry.http_metadata === "object" ? entry.http_metadata : {}) as { contentType?: unknown };
    objects.push({ key: entry.key, size, uploaded, contentType: typeof meta.contentType === "string" ? meta.contentType : null });
  }
  return { state: "ready", objects, cursor, isTruncated };
}

export const AREA_LABELS: Record<string, string> = {
  covers: "News covers",
  business: "Business logos",
  people: "People portraits",
  site: "Site page photos",
  avatars: "Member avatars",
  submissions: "Reader submissions",
  backups: "Database backups",
  other: "Other files",
};

export function areaOf(key: string): keyof typeof AREA_LABELS {
  if (key.startsWith("db-backups/")) return "backups";
  const match = /^media\/([a-z-]+)\//.exec(key);
  const area = match?.[1] ?? "";
  return area in AREA_LABELS && area !== "backups" && area !== "other" ? area : "other";
}

export function isImageObject(object: Pick<StoredObject, "key" | "contentType">): boolean {
  if (object.contentType && /^image\/(jpeg|png|webp|avif)$/i.test(object.contentType)) return true;
  return /\.(jpe?g|png|webp|avif)$/i.test(object.key);
}

/** Logos, avatars and portraits are shown small; covers and page photos can fill the screen. */
export function compressionSideFor(key: string, large: number, small: number): number {
  const area = areaOf(key);
  return area === "business" || area === "avatars" || area === "people" ? small : large;
}

/**
 * Files the cleanup may delete: site uploads (media/…) older than the grace
 * period that no page, article, profile or listing mentions. Everything else
 * stays — including any file whose age is unknown.
 */
export function cleanupCandidates(objects: StoredObject[], inUse: Set<string>, now = Date.now()): StoredObject[] {
  const cutoff = now - CLEANUP_GRACE_HOURS * 3600_000;
  return objects.filter((object) =>
    object.key.startsWith(MEDIA_PREFIX) &&
    // Plain keys only: a key with spaces or symbols might be stored URL-encoded in content and slip past the check.
    /^[A-Za-z0-9._/-]+$/.test(object.key) &&
    !object.key.includes("..") &&
    !inUse.has(object.key) &&
    object.uploaded !== null &&
    Date.parse(object.uploaded) < cutoff,
  );
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const power = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** power;
  return `${value >= 100 || power === 0 ? Math.round(value) : value.toFixed(1)} ${units[power]}`;
}

export type Slice = { label: string; bytes: number; color: string };
export type SlicePath = Slice & { path: string; share: number };

/** SVG donut paths for the slices (centre 100,100; outer radius 90, inner 54). */
export function pieSlices(slices: Slice[]): SlicePath[] {
  const visible = slices.filter((slice) => slice.bytes > 0);
  const total = visible.reduce((sum, slice) => sum + slice.bytes, 0);
  if (!total) return [];
  const point = (radius: number, angle: number) => `${(100 + radius * Math.sin(angle)).toFixed(3)} ${(100 - radius * Math.cos(angle)).toFixed(3)}`;
  let start = 0;
  return visible.map((slice) => {
    const share = slice.bytes / total;
    // A full circle cannot be one arc; stop a hair short so a single slice still draws.
    const end = start + Math.min(share, 0.99999) * Math.PI * 2;
    const large = end - start > Math.PI ? 1 : 0;
    const path = `M ${point(90, start)} A 90 90 0 ${large} 1 ${point(90, end)} L ${point(54, end)} A 54 54 0 ${large} 0 ${point(54, start)} Z`;
    start += share * Math.PI * 2;
    return { ...slice, share, path };
  });
}
