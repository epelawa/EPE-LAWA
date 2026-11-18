import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ headers: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../apps/main/node_modules/next/headers", () => ({ headers: mock.headers }));
import { formClientKey } from "../apps/main/lib/form-server";
beforeEach(() => { vi.stubEnv("VERCEL", "1"); vi.stubEnv("FORM_RATE_SECRET", "s".repeat(32)); mock.headers.mockReset(); });
afterEach(() => vi.unstubAllEnvs());
describe("trusted form client identity", () => {
  it("derives stable opaque fingerprints only from the Vercel header", async () => {
    mock.headers.mockResolvedValue(new Headers({ "x-vercel-forwarded-for": "192.0.2.1", "x-forwarded-for": "203.0.113.1" }));
    const first = await formClientKey();
    mock.headers.mockResolvedValue(new Headers({ "x-vercel-forwarded-for": "192.0.2.1", "x-forwarded-for": "203.0.113.2" }));
    expect(await formClientKey()).toBe(first); expect(first).toMatch(/^[a-f0-9]{64}$/); expect(first).not.toContain("192.0.2.1");
  });
  it.each(["", "garbage", "192.0.2.1, 203.0.113.1"]) ("rejects invalid proxy identity %s", async (ip) => {
    mock.headers.mockResolvedValue(new Headers({ "x-vercel-forwarded-for": ip, "x-forwarded-for": "192.0.2.5" }));
    await expect(formClientKey()).rejects.toThrow();
  });
  it("fails closed without Vercel or a sufficiently long secret", async () => {
    vi.stubEnv("VERCEL", "0"); await expect(formClientKey()).rejects.toThrow();
    vi.stubEnv("VERCEL", "1"); vi.stubEnv("FORM_RATE_SECRET", "short"); await expect(formClientKey()).rejects.toThrow();
  });
});
