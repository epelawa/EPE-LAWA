import "server-only";

/**
 * Server-only read of backup object metadata from Cloudflare R2.
 *
 * SECURITY: credentials are read from server env and NEVER returned to the
 * caller. This module returns only non-sensitive object metadata (key, size,
 * uploaded timestamp). It is imported exclusively by a Server Component and
 * by server actions — never by a Client Component.
 */

export type BackupObject = {
  key: string;
  size: number;
  uploaded: string | null;
};

export type BackupListResult =
  | { state: "ready"; backups: BackupObject[] }
  | { state: "unconfigured" }
  | { state: "unavailable" };

type BackupPageResult =
  | { state: "ready"; backups: BackupObject[]; cursor: string | null; isTruncated: boolean }
  | { state: "unavailable" };

const BACKUP_PREFIX = "db-backups/";
const PAGE_SIZE = 1000;
const MAX_LIST_PAGES = 5;
const OBJECTS_ENDPOINT =
  "https://api.cloudflare.com/client/v4/accounts/{account}/r2/buckets/{bucket}/objects";

/** Keys we generate: db-backups/< UTC-stamp >/< base >.sql.gz[.sha256] */
export function isBackupKey(key: string): boolean {
  return (
    key.startsWith(BACKUP_PREFIX) &&
    key.length > BACKUP_PREFIX.length + 5 &&
    key.length <= 512 &&
    !key.includes("..") &&
    !key.includes("\\") &&
    !/[\u0000-\u001f\u007f]/.test(key) &&
    /\.(sql\.gz|sql\.gz\.sha256)$/.test(key)
  );
}

/** Parse one Cloudflare R2 List Objects v4 page without trusting its shape. */
export function parseBackupListPayload(body: unknown): BackupPageResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { state: "unavailable" };
  const envelope = body as { success?: unknown; result?: unknown; result_info?: unknown };
  if (envelope.success !== true || !Array.isArray(envelope.result)) return { state: "unavailable" };

  const rawInfo = envelope.result_info;
  if (rawInfo !== undefined && (!rawInfo || typeof rawInfo !== "object" || Array.isArray(rawInfo))) {
    return { state: "unavailable" };
  }
  const info = rawInfo as { cursor?: unknown; is_truncated?: unknown } | undefined;
  if (info?.is_truncated !== undefined && typeof info.is_truncated !== "boolean") {
    return { state: "unavailable" };
  }
  const isTruncated = info?.is_truncated === true;
  const cursor = typeof info?.cursor === "string" && info.cursor.length > 0 ? info.cursor : null;
  if (isTruncated && !cursor) return { state: "unavailable" };

  const byKey = new Map<string, BackupObject>();
  for (const raw of envelope.result) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const object = raw as { key?: unknown; size?: unknown; last_modified?: unknown; uploaded?: unknown };
    if (typeof object.key !== "string" || !isBackupKey(object.key) || object.key.endsWith(".sha256")) continue;

    const size = typeof object.size === "number" && Number.isSafeInteger(object.size) && object.size >= 0 ? object.size : 0;
    const rawDate = typeof object.last_modified === "string" ? object.last_modified : object.uploaded;
    const uploaded = typeof rawDate === "string" && Number.isFinite(Date.parse(rawDate)) ? rawDate : null;
    byKey.set(object.key, { key: object.key, size, uploaded });
  }

  const backups = [...byKey.values()].sort((a, b) => {
    const at = a.uploaded ?? "";
    const bt = b.uploaded ?? "";
    return bt.localeCompare(at) || b.key.localeCompare(a.key);
  });
  return { state: "ready", backups, cursor, isTruncated };
}

export async function listBackups(): Promise<BackupListResult> {
  const account = process.env.R2_ACCOUNT_ID?.trim();
  const bucket = process.env.R2_BUCKET_PRIVATE?.trim();
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();

  if (!account || !bucket || !token) return { state: "unconfigured" };

  const endpoint =
    OBJECTS_ENDPOINT.replace("{account}", encodeURIComponent(account)).replace(
      "{bucket}",
      encodeURIComponent(bucket),
    );

  try {
    const byKey = new Map<string, BackupObject>();
    const seenCursors = new Set<string>();
    let cursor: string | null = null;

    for (let page = 0; page < MAX_LIST_PAGES; page += 1) {
      const url = new URL(endpoint);
      url.searchParams.set("prefix", BACKUP_PREFIX);
      url.searchParams.set("per_page", String(PAGE_SIZE));
      if (cursor) url.searchParams.set("cursor", cursor);

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) return { state: "unavailable" };
      const parsed = parseBackupListPayload(await response.json());
      if (parsed.state !== "ready") return parsed;

      for (const backup of parsed.backups) byKey.set(backup.key, backup);
      if (!parsed.isTruncated) {
        const backups = [...byKey.values()].sort((a, b) => {
          const at = a.uploaded ?? "";
          const bt = b.uploaded ?? "";
          return bt.localeCompare(at) || b.key.localeCompare(a.key);
        });
        return { state: "ready", backups };
      }
      if (!parsed.cursor || seenCursors.has(parsed.cursor)) return { state: "unavailable" };
      seenCursors.add(parsed.cursor);
      cursor = parsed.cursor;
    }

    // Never present a partial backup inventory as complete.
    return { state: "unavailable" };
  } catch {
    return { state: "unavailable" };
  }
}
