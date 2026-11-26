import "server-only";
import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from "node:crypto";

/**
 * At-rest protection for browser push subscriptions (web_push_devices).
 *
 * The endpoint URL and the two browser keys are what a sender needs, so they
 * are encrypted with AES-256-GCM before they reach the database; lookups use an
 * HMAC of the endpoint. A leaked copy of the table is therefore useless without
 * the server key, which never leaves the server runtime.
 *
 * Key material: PUSH_DATA_KEY (preferred, 32+ bytes) or, when it is not set,
 * a key derived from FORM_RATE_SECRET with HKDF and a push-specific label, so
 * the two uses never share a key. If the key changes, old rows simply fail to
 * decrypt and are retired; browsers re-register on their next visit.
 */

const VERSION = "v1";

function rootSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  const dedicated = env.PUSH_DATA_KEY?.trim();
  if (dedicated && Buffer.byteLength(dedicated) >= 32) return dedicated;
  const fallback = env.FORM_RATE_SECRET?.trim();
  if (fallback && Buffer.byteLength(fallback) >= 32) return fallback;
  return null;
}

function derive(label: string, env?: NodeJS.ProcessEnv): Buffer | null {
  const secret = rootSecret(env);
  if (!secret) return null;
  return Buffer.from(hkdfSync("sha256", Buffer.from(secret), Buffer.from("epe-lawa"), Buffer.from(label), 32));
}

export function pushCryptoReady(env?: NodeJS.ProcessEnv): boolean {
  return rootSecret(env) !== null;
}

/** Stable lookup hash for an endpoint (hex, 64 chars). */
export function endpointHash(endpoint: string, env?: NodeJS.ProcessEnv): string {
  const key = derive("push-endpoint-lookup-v1", env);
  if (!key) throw new Error("push crypto unavailable");
  return createHmac("sha256", key).update(endpoint).digest("hex");
}

export function sealPushValue(plain: string, env?: NodeJS.ProcessEnv): string {
  const key = derive("push-device-encryption-v1", env);
  if (!key) throw new Error("push crypto unavailable");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `${VERSION}.${iv.toString("base64url")}.${body.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}`;
}

/** Returns null when the value cannot be authenticated (wrong key, tampering). */
export function openPushValue(sealed: string, env?: NodeJS.ProcessEnv): string | null {
  const key = derive("push-device-encryption-v1", env);
  if (!key) return null;
  const parts = sealed.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(parts[1], "base64url"));
    decipher.setAuthTag(Buffer.from(parts[3], "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(parts[2], "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
