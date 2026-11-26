import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { checkHumanSolution, humanCheckMode, issueHumanChallenge, verifyHumanCheck } from "../apps/main/lib/human-check";

const SECRET = "x".repeat(40);

function solve(token: string, difficulty: number): string {
  for (let n = 0; ; n += 1) {
    const d = createHash("sha256").update(`${token}:${n}`).digest();
    let bits = 0;
    for (const byte of d) { if (byte === 0) { bits += 8; continue; } bits += Math.clz32(byte) - 24; break; }
    if (bits >= difficulty) return String(n);
  }
}

afterEach(() => { vi.unstubAllEnvs(); });

describe("EPE LAWA human check", () => {
  it("is off without a strong secret and prefers real Turnstile when both keys exist", () => {
    vi.stubEnv("FORM_RATE_SECRET", "short");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    expect(humanCheckMode()).toBe("off");
    expect(issueHumanChallenge()).toBeNull();
    vi.stubEnv("FORM_RATE_SECRET", SECRET);
    expect(humanCheckMode()).toBe("own");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site");
    expect(humanCheckMode()).toBe("turnstile");
  });

  it("accepts a solved, signed challenge only inside its time window", () => {
    vi.stubEnv("FORM_RATE_SECRET", SECRET);
    const issuedAt = 1_800_000_000_000;
    const challenge = issueHumanChallenge(issuedAt)!;
    const solution = solve(challenge.token, challenge.difficulty);
    expect(checkHumanSolution(challenge.token, solution, issuedAt + 500)).toBe(false); // posted instantly
    expect(checkHumanSolution(challenge.token, solution, issuedAt + 5_000)).toBe(true);
    expect(checkHumanSolution(challenge.token, solution, issuedAt + 3 * 60 * 60 * 1000)).toBe(false); // stale
  });

  it("rejects wrong answers, forged signatures, weakened difficulty and other keys", () => {
    vi.stubEnv("FORM_RATE_SECRET", SECRET);
    const issuedAt = 1_800_000_000_000;
    const { token, difficulty } = issueHumanChallenge(issuedAt)!;
    const solution = solve(token, difficulty);
    const later = issuedAt + 5_000;
    const [t, nonce, , sig] = token.split(".");
    expect(checkHumanSolution(`${t}.${nonce}.1.${sig}`, solution, later)).toBe(false);
    expect(checkHumanSolution(`${t}.${nonce}.${difficulty}.AAAA`, solution, later)).toBe(false);
    expect(checkHumanSolution(token, "not-a-number", later)).toBe(false);
    vi.stubEnv("FORM_RATE_SECRET", "y".repeat(40));
    expect(checkHumanSolution(token, solution, later)).toBe(false);
  });

  it("fails a form with no answer when the check is configured, and passes when it is off", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    vi.stubEnv("FORM_RATE_SECRET", SECRET);
    expect(await verifyHumanCheck(new FormData())).toBe("fail");
    vi.stubEnv("FORM_RATE_SECRET", "");
    expect(await verifyHumanCheck(new FormData())).toBe("off");
  });
});
