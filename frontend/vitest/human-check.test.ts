import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SIGNIN_DIFFICULTY, checkHumanSolution, humanCheckMode, issueHumanChallenge, verifyHumanCheck, verifySigninHumanCheck } from "../apps/main/lib/human-check";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("../apps/main/lib/form-server", () => ({ formAdminClient: () => ({ rpc }) }));

const SECRET = "x".repeat(40);

function solve(token: string, difficulty: number): string {
  for (let n = 0; ; n += 1) {
    const d = createHash("sha256").update(`${token}:${n}`).digest();
    let bits = 0;
    for (const byte of d) { if (byte === 0) { bits += 8; continue; } bits += Math.clz32(byte) - 24; break; }
    if (bits >= difficulty) return String(n);
  }
}

afterEach(() => { vi.unstubAllEnvs(); rpc.mockReset(); });

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

  it("sign-in needs the harder challenge, and each solved token is spent once (Strix on PR #280)", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    vi.stubEnv("FORM_RATE_SECRET", SECRET);
    const issuedAt = 1_800_000_000_000;
    const later = issuedAt + 5_000;
    const form = (token: string, solution: string) => { const f = new FormData(); f.set("hc-token", token); f.set("hc-solution", solution); return f; };

    // A public-form token (14 bits) is not enough for a password check.
    const weak = issueHumanChallenge(issuedAt)!;
    expect(await verifySigninHumanCheck(form(weak.token, solve(weak.token, weak.difficulty)), later)).toBe("fail");
    expect(rpc).not.toHaveBeenCalled();

    const strong = issueHumanChallenge(issuedAt, SIGNIN_DIFFICULTY)!;
    expect(strong.difficulty).toBe(16);
    const answer = solve(strong.token, strong.difficulty);
    expect(checkHumanSolution(strong.token, answer, later)).toBe(true); // still fine for public forms
    rpc.mockResolvedValueOnce({ data: true, error: null });
    expect(await verifySigninHumanCheck(form(strong.token, answer), later)).toBe("pass");
    expect(rpc).toHaveBeenCalledWith("human_check_spend", {
      p_token_hash: createHash("sha256").update(strong.token).digest("hex"),
      p_expires_at: new Date(issuedAt + 2 * 60 * 60 * 1000).toISOString(),
    });
    rpc.mockResolvedValueOnce({ data: false, error: null });
    expect(await verifySigninHumanCheck(form(strong.token, answer), later)).toBe("fail"); // replay
    rpc.mockResolvedValueOnce({ data: null, error: { code: "XX000" } });
    expect(await verifySigninHumanCheck(form(strong.token, answer), later)).toBe("fail"); // fail closed
    rpc.mockRejectedValueOnce(new Error("offline"));
    expect(await verifySigninHumanCheck(form(strong.token, answer), later)).toBe("fail");
    expect(await verifySigninHumanCheck(form(strong.token, "1"), later)).toBe("fail"); // wrong answer, no spend
    expect(rpc).toHaveBeenCalledTimes(4);

    vi.stubEnv("FORM_RATE_SECRET", "");
    expect(await verifySigninHumanCheck(new FormData())).toBe("off");
  });
});
