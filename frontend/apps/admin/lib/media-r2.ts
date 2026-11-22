import "server-only";

import { optimizeUploadedImage, toExactArrayBuffer } from "@epelawa/image-optimizer/optimize";
import { publicMediaUrl } from "../../main/lib/media";

/**
 * Server-only Cloudflare R2 object writes/removes for the media workspace.
 *
 * SECURITY: credentials are read from server env and never returned to the
 * caller. Only non-sensitive metadata leaves this module (bucket, key,
 * byte size). Requires an API token with R2 object write scope on the target
 * bucket; without configuration the workspace fails closed.
 */

export type ObjectWrite = { state: "ready"; key: string; size: number; mimeType: "image/webp"; width: number; height: number } | { state: "unconfigured" } | { state: "unavailable" };
export type ObjectRemove = { state: "ready" } | { state: "unconfigured" } | { state: "unavailable" };

function objectUrl(account: string, bucket: string, key: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
    account,
  )}/r2/buckets/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(key)}`;
}

function credentials(): { account: string; token: string; publicBucket: string; privateBucket: string } | { state: "unconfigured" } {
  const account = process.env.R2_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const publicBucket = process.env.R2_BUCKET_PUBLIC?.trim();
  const privateBucket = process.env.R2_BUCKET_PRIVATE?.trim();
  if (!account || !token || !publicBucket || !privateBucket) return { state: "unconfigured" };
  return { account, token, publicBucket, privateBucket };
}

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".webp",
  "image/png": ".webp",
  "image/webp": ".webp",
  "image/avif": ".webp",
};

export function mediaExtensionFor(mime: string): string | null {
  return MIME_TO_EXT[mime.toLowerCase()] ?? null;
}

function resolveBucket(bucket: string, creds: { publicBucket: string; privateBucket: string }): string {
  return bucket === "private" ? creds.privateBucket : creds.publicBucket;
}

export async function putMediaObject(bucket: string, key: string, body: ArrayBuffer | Uint8Array, mime: string): Promise<ObjectWrite> {
  const creds = credentials();
  if ("state" in creds) return { state: "unconfigured" };
  const remote = resolveBucket(bucket, creds);
  let optimized: Awaited<ReturnType<typeof optimizeUploadedImage>>;
  try {
    optimized = await optimizeUploadedImage(body, mime);
  } catch {
    return { state: "unavailable" };
  }
  const outputKey = /\.(?:jpe?g|png|webp|avif)$/i.test(key)
    ? key.replace(/\.(?:jpe?g|png|webp|avif)$/i, optimized.extension)
    : `${key}${optimized.extension}`;
  const exactBody = toExactArrayBuffer(optimized.bytes);
  try {
    const response = await fetch(objectUrl(creds.account, remote, outputKey), {
      method: "PUT",
      headers: { Authorization: `Bearer ${creds.token}`, "Content-Type": optimized.mimeType },
      body: exactBody,
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return { state: "unavailable" };
    return { state: "ready", key: outputKey, size: exactBody.byteLength, mimeType: optimized.mimeType, width: optimized.width, height: optimized.height };
  } catch {
    return { state: "unavailable" };
  }
}

export async function deleteMediaObject(bucket: string, key: string): Promise<ObjectRemove> {
  const creds = credentials();
  if ("state" in creds) return { state: "unconfigured" };
  const remote = resolveBucket(bucket, creds);
  try {
    const response = await fetch(objectUrl(creds.account, remote, key), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${creds.token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok && response.status !== 404) return { state: "unavailable" };
    return { state: "ready" };
  } catch {
    return { state: "unavailable" };
  }
}

export type CoverUploadState = { state: "ready" } | { state: "unconfigured"; reason: string };

export function coverUploadState(): CoverUploadState {
  const creds = credentials();
  if ("state" in creds) return { state: "unconfigured", reason: "missing_credentials" };
  if (!publicMediaUrl("media/covers/probe")) return { state: "unconfigured", reason: "missing_public_base_url" };
  return { state: "ready" };
}
