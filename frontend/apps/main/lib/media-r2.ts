import "server-only";

import { optimizeUploadedImage, toExactArrayBuffer } from "@epelawa/image-optimizer/optimize";
import { publicMediaUrl } from "./media";

/**
 * Server-only Cloudflare R2 object writes for member-facing uploads
 * (business logos, tourism photos). Fails closed without configuration.
 */

export type ObjectWrite = { state: "ready"; key: string; size: number; mimeType: "image/webp"; width: number; height: number } | { state: "unconfigured" } | { state: "unavailable" };

function objectUrl(account: string, bucket: string, key: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/r2/buckets/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(key)}`;
}

function credentials(): { account: string; token: string; publicBucket: string } | { state: "unconfigured" } {
  const account = process.env.R2_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const publicBucket = process.env.R2_BUCKET_PUBLIC?.trim();
  if (!account || !token || !publicBucket) return { state: "unconfigured" };
  return { account, token, publicBucket };
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

export async function putMediaObject(key: string, body: ArrayBuffer | Uint8Array, mime: string): Promise<ObjectWrite> {
  const creds = credentials();
  if ("state" in creds) return { state: "unconfigured" };
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
    const response = await fetch(objectUrl(creds.account, creds.publicBucket, outputKey), {
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

/** Delete only the exact public object created during a failed member upload. */
export async function deleteMediaObject(key: string): Promise<boolean> {
  const creds = credentials();
  if ("state" in creds) return false;
  try {
    const response = await fetch(objectUrl(creds.account, creds.publicBucket, key), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${creds.token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}

const DATA_URL = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/;

export type StoredLogo = { key: string } | { error: string };

/** Store a client-compressed data-URL image as a public R2 object. */
export async function storeLogoDataUrl(dataUrl: string, stem = "logo", prefix = "media/business"): Promise<StoredLogo> {
  const match = DATA_URL.exec(dataUrl.trim());
  if (!match) return { error: "format" };
  const mime = `image/${match[1]}`;
  const extension = mediaExtensionFor(mime);
  if (!extension) return { error: "format" };
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.byteLength > 5 * 1024 * 1024) return { error: "too_large" };
  if (buffer.byteLength < 64) return { error: "format" };
  const random = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, "0")).join("");
  const safeStem = stem.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase().slice(0, 40) || "logo";
  const key = `${prefix}/${new Date().getUTCFullYear()}/${random}-${safeStem}${extension}`;
  const written = await putMediaObject(key, new Uint8Array(buffer), mime);
  return written.state === "ready" ? { key: written.key } : { error: written.state };
}

/** Store a member avatar (client-compressed data URL) under the avatars prefix. */
export async function storeAvatarDataUrl(dataUrl: string, stem = "avatar"): Promise<StoredLogo> {
  return storeLogoDataUrl(dataUrl, stem, "media/avatars");
}

/** Resolve a stored logo reference (R2 key or HTTPS URL) to a display URL. */
export function logoDisplayUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.startsWith("https://")) return trimmed;
  return publicMediaUrl(trimmed);
}

export type SubmissionImage =
  | { state: "none" }
  | { state: "stored"; key: string; alt: string | null }
  | { state: "failed"; message: string };

/**
 * Store the optional `image_data` photo of a public submission under
 * `media/submissions/<kind>/…`. Failures are reported with a plain message so
 * the caller can still save the text submission and tell the visitor the photo
 * was not attached, instead of losing everything they typed.
 */
export async function storeSubmissionImage(form: FormData, kind: "events" | "history", stem: string): Promise<SubmissionImage> {
  const raw = form.get("image_data");
  if (typeof raw !== "string" || !raw.trim()) return { state: "none" };
  const altRaw = form.get("image_alt");
  const alt = typeof altRaw === "string" && altRaw.trim() ? altRaw.trim().slice(0, 300) : null;
  const stored = await storeLogoDataUrl(raw, stem, `media/submissions/${kind}`);
  if ("key" in stored) return { state: "stored", key: stored.key, alt };
  if (stored.error === "unconfigured") return { state: "failed", message: "Photo storage is not connected on this site yet, so your photo was not attached." };
  if (stored.error === "unavailable") return { state: "failed", message: "Your photo could not be stored just now, so it was not attached." };
  return { state: "failed", message: "That photo could not be used, so it was not attached." };
}
