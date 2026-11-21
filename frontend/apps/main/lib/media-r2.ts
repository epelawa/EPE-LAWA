import "server-only";

import { publicMediaUrl } from "./media";

/**
 * Server-only Cloudflare R2 write for community-submitted photos.
 * Credentials stay in server env; only non-sensitive metadata is returned.
 */

export type MediaWrite = { state: "ready"; key: string; size: number } | { state: "unconfigured" } | { state: "unavailable" };

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export function mediaExtensionFor(mime: string): string | null {
  return MIME_TO_EXT[mime.toLowerCase()] ?? null;
}

export async function putPublicMediaObject(key: string, body: ArrayBuffer, mime: string): Promise<MediaWrite> {
  const account = process.env.R2_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const bucket = process.env.R2_BUCKET_PUBLIC?.trim();
  if (!account || !token || !bucket) return { state: "unconfigured" };
  const remote = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/r2/buckets/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(key)}`;
  try {
    const response = await fetch(remote, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": mime },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return { state: "unavailable" };
    return { state: "ready", key, size: body.byteLength };
  } catch {
    return { state: "unavailable" };
  }
}

export function publicContributedPhotoUrl(key: string): string | null {
  return publicMediaUrl(key);
}
