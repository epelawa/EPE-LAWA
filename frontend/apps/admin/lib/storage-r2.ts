import "server-only";

import { parseObjectPage, type StoredObject } from "./storage-plan";

/**
 * Server-only Cloudflare R2 inventory and object access for the Storage desk.
 * Credentials come from server env and never leave this module; callers get
 * object metadata or bytes only.
 */

export type BucketName = "public" | "private";
export type Inventory =
  | { state: "ready"; objects: StoredObject[]; complete: boolean }
  | { state: "unconfigured"; missing: string[] }
  | { state: "unavailable" };

const PAGE_SIZE = 1000;
/** 20,000 objects per bucket is far beyond this site's size; a bigger bucket is reported as incomplete. */
const MAX_PAGES = 20;

function config() {
  const values = {
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID?.trim(),
    CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN?.trim(),
    R2_BUCKET_PUBLIC: process.env.R2_BUCKET_PUBLIC?.trim(),
    R2_BUCKET_PRIVATE: process.env.R2_BUCKET_PRIVATE?.trim(),
  };
  const missing = Object.entries(values).filter(([, value]) => !value).map(([name]) => name);
  return { values, missing };
}

export function storageMissingEnv(): string[] {
  return config().missing;
}

function bucketUrl(bucket: BucketName): { base: string; token: string } | null {
  const { values, missing } = config();
  if (missing.length) return null;
  const name = bucket === "private" ? values.R2_BUCKET_PRIVATE! : values.R2_BUCKET_PUBLIC!;
  return {
    base: `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(values.R2_ACCOUNT_ID!)}/r2/buckets/${encodeURIComponent(name)}/objects`,
    token: values.CLOUDFLARE_API_TOKEN!,
  };
}

export async function listBucket(bucket: BucketName, prefix = ""): Promise<Inventory> {
  const target = bucketUrl(bucket);
  if (!target) return { state: "unconfigured", missing: config().missing };
  const objects = new Map<string, StoredObject>();
  const seen = new Set<string>();
  let cursor: string | null = null;
  try {
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const url = new URL(target.base);
      url.searchParams.set("per_page", String(PAGE_SIZE));
      if (prefix) url.searchParams.set("prefix", prefix);
      if (cursor) url.searchParams.set("cursor", cursor);
      const response = await fetch(url, { headers: { Authorization: `Bearer ${target.token}` }, cache: "no-store", signal: AbortSignal.timeout(15_000) });
      if (!response.ok) return { state: "unavailable" };
      const parsed = parseObjectPage(await response.json());
      if (parsed.state !== "ready") return parsed;
      for (const object of parsed.objects) objects.set(object.key, object);
      if (!parsed.isTruncated) return { state: "ready", objects: [...objects.values()], complete: true };
      if (!parsed.cursor || seen.has(parsed.cursor)) return { state: "unavailable" };
      seen.add(parsed.cursor);
      cursor = parsed.cursor;
    }
    return { state: "ready", objects: [...objects.values()], complete: false };
  } catch {
    return { state: "unavailable" };
  }
}

const objectUrl = (base: string, key: string) => `${base}/${encodeURIComponent(key)}`;

export async function readObject(bucket: BucketName, key: string): Promise<Uint8Array | null> {
  const target = bucketUrl(bucket);
  if (!target) return null;
  try {
    const response = await fetch(objectUrl(target.base, key), { headers: { Authorization: `Bearer ${target.token}` }, cache: "no-store", signal: AbortSignal.timeout(30_000) });
    if (!response.ok) return null;
    return new Uint8Array(await response.arrayBuffer());
  } catch {
    return null;
  }
}

/** Overwrite an object under the SAME key, so every page that links to it keeps working. */
export async function replaceObject(bucket: BucketName, key: string, bytes: Uint8Array, contentType: string): Promise<boolean> {
  const target = bucketUrl(bucket);
  if (!target) return false;
  const body = new Uint8Array(bytes.byteLength);
  body.set(bytes);
  try {
    const response = await fetch(objectUrl(target.base, key), {
      method: "PUT",
      headers: { Authorization: `Bearer ${target.token}`, "Content-Type": contentType },
      body: body.buffer,
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function removeObject(bucket: BucketName, key: string): Promise<boolean> {
  const target = bucketUrl(bucket);
  if (!target) return false;
  try {
    const response = await fetch(objectUrl(target.base, key), { method: "DELETE", headers: { Authorization: `Bearer ${target.token}` }, cache: "no-store", signal: AbortSignal.timeout(15_000) });
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}
