import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "../apps/main/lib/turnstile";
import TurnstileField from "../apps/main/components/turnstile-field";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("turnstile verification", () => {
  it("stays off without a secret and never contacts the verifier", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");

    const form = new FormData();
    form.set("cf-turnstile-response", "some-token");
    expect(await verifyTurnstile(form)).toBe("off");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects missing tokens and only passes on Cloudflare success", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "test-secret");
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: false }), { headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchSpy);

    const failing = new FormData();
    expect(await verifyTurnstile(failing)).toBe("fail");

    const passing = new FormData();
    passing.set("cf-turnstile-response", "good-token");
    expect(await verifyTurnstile(passing)).toBe("pass");
    expect(await verifyTurnstile(passing)).toBe("fail");
  });
});

describe("turnstile widget", () => {
  it("renders nothing without a site key", () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    expect(renderToStaticMarkup(<TurnstileField />)).toBe("");
  });

  it("mounts a container and hidden response input when configured", () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key");
    const markup = renderToStaticMarkup(<TurnstileField compact />);
    expect(markup).toContain("cf-turnstile-response");
    expect(markup).not.toContain("site-key");
  });
});
