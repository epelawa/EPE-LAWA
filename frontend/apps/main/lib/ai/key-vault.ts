import "server-only";
import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PROVIDERS, type ProviderId, type StoredKeys } from "./providers";

/**
 * AI provider keys typed into the admin page (owner, turn 26). A key is
 * encrypted on the server with AES-256-GCM before it is stored, and it is never
 * sent back to any browser: the page only learns "saved on <date>".
 *
 * - The encryption key comes from AI_KEYS_SECRET (a Vercel env var that never
 *   reaches the browser or the database), stretched with HKDF.
 * - Each provider's key is bound to its provider name (GCM additional data),
 *   so a row copied onto another provider fails to decrypt.
 * - The table is readable only by the server's service role (no RLS policy for
 *   anyone else), so a stolen database row is useless without the Vercel secret.
 */

const VERSION = "v1";
const TABLE = "ai_provider_keys";

function vaultSecret(env: NodeJS.ProcessEnv = process.env): Buffer | null {
  const secret = env.AI_KEYS_SECRET?.trim();
  if (!secret || secret.length < 32) return null;
  return Buffer.from(hkdfSync("sha256", Buffer.from(secret, "utf8"), Buffer.from("epe-lawa-ai-keys", "utf8"), Buffer.from("aes-256-gcm v1", "utf8"), 32));
}

export function vaultReady(env: NodeJS.ProcessEnv = process.env): boolean {
  return vaultSecret(env) !== null;
}

export function sealKey(provider: ProviderId, plain: string, env: NodeJS.ProcessEnv = process.env): string {
  const key = vaultSecret(env);
  if (!key) throw new Error("AI_KEYS_SECRET is not set");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(`provider:${provider}`, "utf8"));
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

export function openKey(provider: ProviderId, sealed: string, env: NodeJS.ProcessEnv = process.env): string | null {
  const key = vaultSecret(env);
  const [version, iv, tag, body] = sealed.split(".");
  if (!key || version !== VERSION || !iv || !tag || !body) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
    decipher.setAAD(Buffer.from(`provider:${provider}`, "utf8"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/**
 * A fingerprint so the page can tell two saves apart without revealing anything
 * about the key: an HMAC keyed by a separate secret derived from AI_KEYS_SECRET,
 * so it cannot be checked against guesses by anyone without the Vercel secret.
 */
export function keyFingerprint(plain: string, env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.AI_KEYS_SECRET?.trim();
  if (!secret || secret.length < 32) throw new Error("AI_KEYS_SECRET is not set");
  const macKey = Buffer.from(hkdfSync("sha256", Buffer.from(secret, "utf8"), Buffer.from("epe-lawa-ai-keys", "utf8"), Buffer.from("fingerprint v1", "utf8"), 32));
  return createHmac("sha256", macKey).update(plain, "utf8").digest("hex").slice(0, 12);
}

let memo: { at: number; keys: StoredKeys } | null = null;
const MEMO_MS = 60_000;

export function forgetStoredKeys() {
  memo = null;
}

/** Decrypted saved keys, for server-side calls only. */
export async function loadStoredKeys(db: SupabaseClient): Promise<StoredKeys> {
  if (memo && Date.now() - memo.at < MEMO_MS) return memo.keys;
  const keys: StoredKeys = {};
  if (vaultReady()) {
    const { data } = await db.from(TABLE).select("provider,sealed");
    for (const row of (data ?? []) as { provider: string; sealed: string }[]) {
      const provider = PROVIDERS.find((entry) => entry.id === row.provider);
      if (!provider) continue;
      const plain = openKey(provider.id, row.sealed);
      if (plain) keys[provider.id] = plain;
    }
  }
  memo = { at: Date.now(), keys };
  return keys;
}

export type SavedKeyInfo = { provider: ProviderId; savedAt: string; fingerprint: string; readable: boolean };

/** What the admin page may show: which providers have a saved key and when. Never the key. */
export async function savedKeyInfo(db: SupabaseClient): Promise<SavedKeyInfo[]> {
  const { data } = await db.from(TABLE).select("provider,sealed,fingerprint,updated_at");
  return ((data ?? []) as { provider: ProviderId; sealed: string; fingerprint: string; updated_at: string }[]).map((row) => ({
    provider: row.provider,
    savedAt: row.updated_at,
    fingerprint: row.fingerprint,
    readable: openKey(row.provider, row.sealed) !== null,
  }));
}

export async function storeKey(db: SupabaseClient, provider: ProviderId, plain: string, userId: string | null): Promise<string | null> {
  const sealed = sealKey(provider, plain.trim());
  const { error } = await db.from(TABLE).upsert({ provider, sealed, fingerprint: keyFingerprint(plain.trim()), updated_at: new Date().toISOString(), updated_by: userId }, { onConflict: "provider" });
  forgetStoredKeys();
  return error ? error.message : null;
}

export async function removeKey(db: SupabaseClient, provider: ProviderId): Promise<string | null> {
  const { error } = await db.from(TABLE).delete().eq("provider", provider);
  forgetStoredKeys();
  return error ? error.message : null;
}
