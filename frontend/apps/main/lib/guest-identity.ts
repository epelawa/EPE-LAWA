import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Signed-out readers can comment and like. Each browser gets a random,
 * httpOnly reader cookie; the database only ever sees an HMAC of it (or of a
 * member's id), so likes are counted once per reader and a guest can delete
 * their own comment, without any account or personal data.
 */

export const READER_COOKIE = "epl_reader";
const ONE_YEAR = 365 * 24 * 3600;

function secret(): string | null {
  const value = process.env.FORM_RATE_SECRET;
  if (value && Buffer.byteLength(value) >= 32) return value;
  return process.env.VERCEL === "1" ? null : "local-development-reader-key-not-for-production";
}

function key(kind: "guest" | "member", value: string): string | null {
  const material = secret();
  return material ? createHmac("sha256", material).update(`${kind}:${value}`).digest("hex") : null;
}

export async function readGuestKey(): Promise<string | null> {
  const value = (await cookies()).get(READER_COOKIE)?.value;
  return value && /^[A-Za-z0-9_-]{32,64}$/.test(value) ? key("guest", value) : null;
}

/** Server actions only (sets the cookie when missing). */
export async function ensureGuestKey(): Promise<string | null> {
  const store = await cookies();
  let value = store.get(READER_COOKIE)?.value;
  if (!value || !/^[A-Za-z0-9_-]{32,64}$/.test(value)) {
    value = randomBytes(32).toString("base64url");
    store.set(READER_COOKIE, value, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: ONE_YEAR });
  }
  return key("guest", value);
}

export function memberVoterKey(userId: string): string | null {
  return key("member", userId);
}
