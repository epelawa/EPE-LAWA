import "server-only";

import { publicMediaUrl } from "./media";

/**
 * Server-only Cloudflare R2 object writes for member-facing uploads
 * (business logos, tourism photos). Fails closed without configuration.
 */

export type ObjectWrite = { state: "ready"; key: string; size: number } | { state: "unconfigured" } | { state: "unavailable" };

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
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

export function mediaExtensionFor(mime: string): string | null {
  return MIME_TO_EXT[mime.toLowerCase()] ?? null;
}

export async function putMediaObject(key: string, body: ArrayBuffer, mime: string): Promise<ObjectWrite> {
  const creds = credentials();
  if ("state" in creds) return { state: "unconfigured" };
  try {
    const response = await fetch(objectUrl(creds.account, creds.publicBucket, key), {
      method: "PUT",
      headers: { Authorization: `Bearer ${creds.token}`, "Content-Type": mime },
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

const DATA_URL = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/;

export type StoredLogo = { key: string } | { error: string };

/** Store a client-compressed data-URL image as a public R2 object. */
export async function storeLogoDataUrl(dataUrl: string, stem = "logo"): Promise<StoredLogo> {
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
  const key = `media/business/${new Date().getUTCFullYear()}/${random}-${safeStem}${extension}`;
  const written = await putMediaObject(key, buffer.buffer as ArrayBuffer, mime);
  return written.state === "ready" ? { key } : { error: written.state };
}

/** Resolve a stored logo reference (R2 key or HTTPS URL) to a display URL. */
export function logoDisplayUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.startsWith("https://")) return trimmed;
  return publicMediaUrl(trimmed);
}
