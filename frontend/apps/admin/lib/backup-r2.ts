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

const BACKUP_PREFIX = "db-backups/";
const MAX_KEYS = 100;
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

function stripChecksumSuffix(key: string): string {
  return key.endsWith(".sha256") ? key.slice(0, -".sha256".length) : key;
}

export async function listBackups(): Promise<BackupListResult> {
  const account = process.env.R2_ACCOUNT_ID?.trim();
  const bucket = process.env.R2_BUCKET_PRIVATE?.trim();
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();

  if (!account || !bucket || !token) return { state: "unconfigured" };

  const url =
    OBJECTS_ENDPOINT.replace("{account}", encodeURIComponent(account)).replace(
      "{bucket}",
      encodeURIComponent(bucket),
    ) + `?prefix=${encodeURIComponent(BACKUP_PREFIX)}&per_page=${MAX_KEYS}`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return { state: "unavailable" };
    const body = (await response.json()) as {
      success?: boolean;
      result?: { objects?: Array<{ key: string; size?: number; uploaded?: string }> };
    };
    if (body.success !== true || !Array.isArray(body.result?.objects)) {
      return { state: "unavailable" };
    }

    // Group dump + checksum entries by dump key; expose one row per backup.
    const byKey = new Map<string, BackupObject>();
    for (const object of body.result.objects) {
      if (!object || typeof object.key !== "string" || !isBackupKey(object.key)) continue;
      const key = stripChecksumSuffix(object.key);
      const size = typeof object.size === "number" && object.size >= 0 ? object.size : 0;
      const uploaded = typeof object.uploaded === "string" ? object.uploaded : null;
      const existing = byKey.get(key);
      if (!existing || (uploaded && (!existing.uploaded || uploaded > existing.uploaded))) {
        byKey.set(key, { key, size, uploaded: uploaded ?? existing?.uploaded ?? null });
      }
    }

    const backups = [...byKey.values()].sort((a, b) => {
      const at = a.uploaded ?? "";
      const bt = b.uploaded ?? "";
      return bt.localeCompare(at) || b.key.localeCompare(a.key);
    });
    return { state: "ready", backups };
  } catch {
    return { state: "unavailable" };
  }
}
