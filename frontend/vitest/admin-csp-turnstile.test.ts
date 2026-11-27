import { afterEach, describe, expect, it, vi } from "vitest";
import { contentSecurityPolicy } from "../apps/admin/lib/csp";

const directive = (policy: string, name: string) => policy.split(";").map((d) => d.trim()).find((d) => d.startsWith(`${name} `)) ?? "";

describe("admin CSP and Turnstile (CodeRabbit review on PR #282)", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("allows the Turnstile origin only when a site key is set", () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "0x4AAAAAAA");
    const on = contentSecurityPolicy("abc");
    for (const name of ["script-src", "connect-src", "frame-src", "worker-src"]) expect(directive(on, name)).toContain("https://challenges.cloudflare.com");
    expect(directive(on, "frame-src")).toContain("https://www.openstreetmap.org");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    const off = contentSecurityPolicy("abc");
    expect(off).not.toContain("challenges.cloudflare.com");
    expect(directive(off, "frame-src")).toBe("frame-src https://www.openstreetmap.org");
  });
});
