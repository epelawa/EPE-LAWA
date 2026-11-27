import "server-only";
import { createHash, createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";
import { verifyTurnstile } from "./turnstile";
import { formAdminClient } from "./form-server";

/**
 * EPE LAWA's own human check, a Turnstile-style invisible challenge for the
 * public forms. When Cloudflare Turnstile keys are configured, the real
 * Turnstile is used instead (lib/turnstile.ts) and this code is bypassed.
 *
 * How it works: the server hands out a signed, timestamped challenge; the
 * browser must find a number whose SHA-256 with the challenge starts with
 * DIFFICULTY zero bits (a fraction of a second for a person's phone, costly
 * for a bot farm submitting thousands of times), and the form must be sent no
 * sooner than MIN_AGE_MS after the challenge was issued (bots post instantly).
 * Combined with the honeypot fields and per-network rate limits, this stops
 * scripted floods without tracking anyone or loading third-party code.
 */

const DIFFICULTY = 14;
/**
 * Sign-in forms (member and staff) need a harder challenge, and each solved
 * token is good for ONE password check (verifySigninHumanCheck), so arming a
 * per-account lock costs eight solves instead of eight plain requests (Strix
 * review on PR #280). The browser starts solving while the visitor types.
 */
export const SIGNIN_DIFFICULTY = 16;
const MIN_AGE_MS = 2_500;
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

function key(): Buffer | null {
  const secret = process.env.FORM_RATE_SECRET?.trim();
  if (!secret || Buffer.byteLength(secret) < 32) return null;
  return Buffer.from(hkdfSync("sha256", Buffer.from(secret), Buffer.from("epe-lawa"), Buffer.from("human-check-v1"), 32));
}

function sign(body: string, secret: Buffer): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function humanCheckMode(): "turnstile" | "own" | "off" {
  if (process.env.TURNSTILE_SECRET_KEY?.trim() && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()) return "turnstile";
  return key() ? "own" : "off";
}

export function issueHumanChallenge(now = Date.now(), difficulty = DIFFICULTY): { token: string; difficulty: number } | null {
  const secret = key();
  if (!secret) return null;
  const body = `${now}.${randomBytes(12).toString("base64url")}.${difficulty}`;
  return { token: `${body}.${sign(body, secret)}`, difficulty };
}

function leadingZeroBits(digest: Buffer): number {
  let bits = 0;
  for (const byte of digest) {
    if (byte === 0) { bits += 8; continue; }
    bits += Math.clz32(byte) - 24;
    break;
  }
  return bits;
}

export function checkHumanSolution(token: string, solution: string, now = Date.now(), minDifficulty = DIFFICULTY): boolean {
  const secret = key();
  if (!secret || token.length > 300 || !/^\d{1,12}$/.test(solution)) return false;
  const parts = token.split(".");
  if (parts.length !== 4) return false;
  const [issued, nonce, difficultyRaw, signature] = parts;
  const body = `${issued}.${nonce}.${difficultyRaw}`;
  const expected = Buffer.from(sign(body, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  const age = now - Number(issued);
  if (!Number.isFinite(age) || age < MIN_AGE_MS || age > MAX_AGE_MS) return false;
  const difficulty = Number(difficultyRaw);
  if (!Number.isInteger(difficulty) || difficulty < Math.max(DIFFICULTY, minDifficulty) || difficulty > 24) return false;
  return leadingZeroBits(createHash("sha256").update(`${token}:${solution}`).digest()) >= difficulty;
}

export type HumanVerdict = "off" | "pass" | "fail";

/** Verifies whichever challenge this deployment uses. Never silently passes a configured check. */
export async function verifyHumanCheck(form: FormData): Promise<HumanVerdict> {
  const mode = humanCheckMode();
  if (mode === "turnstile") return verifyTurnstile(form);
  if (mode === "off") return "off";
  const token = form.get("hc-token");
  const solution = form.get("hc-solution");
  if (typeof token !== "string" || typeof solution !== "string") return "fail";
  return checkHumanSolution(token, solution) ? "pass" : "fail";
}

export const humanCheckFailedMessage = "The human check did not finish. Wait for “Verified” under the form, then send again — nothing was saved.";

export const signinHumanCheckFailedMessage = "The human check did not finish. Wait for “Verified” under the form, then sign in again.";

/**
 * Sign-in variant of verifyHumanCheck: the built-in challenge must carry at
 * least SIGNIN_DIFFICULTY bits and is spent on first use (a database row keyed
 * by a hash of the server-signed token, kept until the token would expire
 * anyway). Turnstile tokens are already single-use at Cloudflare. If the spend
 * cannot be recorded the check fails closed.
 */
export async function verifySigninHumanCheck(form: FormData, now = Date.now()): Promise<HumanVerdict> {
  const mode = humanCheckMode();
  if (mode === "turnstile") return verifyTurnstile(form);
  if (mode === "off") return "off";
  const token = form.get("hc-token");
  const solution = form.get("hc-solution");
  if (typeof token !== "string" || typeof solution !== "string") return "fail";
  if (!checkHumanSolution(token, solution, now, SIGNIN_DIFFICULTY)) return "fail";
  try {
    const { data, error } = await formAdminClient().rpc("human_check_spend", {
      p_token_hash: createHash("sha256").update(token).digest("hex"),
      p_expires_at: new Date(Number(token.split(".")[0]) + MAX_AGE_MS).toISOString(),
    });
    if (error) {
      console.error("human check spend failed", { code: error.code });
      return "fail";
    }
    return data === true ? "pass" : "fail";
  } catch {
    return "fail";
  }
}
