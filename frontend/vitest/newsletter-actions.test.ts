import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), key: vi.fn(), admin: vi.fn(), config: vi.fn(), send: vi.fn() }));
vi.mock("../apps/main/lib/form-server", () => ({ formClientKey: mocks.key, formAdminClient: mocks.admin }));
vi.mock("../apps/main/lib/auth-mail-hook", () => ({ authMailConfig: mocks.config, deliverAuthMessage: mocks.send, emailShell: (_title: string, html: string) => html }));
vi.mock("../apps/main/lib/supabase", () => ({ createClient: vi.fn() }));
import { subscribeNewsletter, confirmNewsletter } from "../apps/main/app/newsletter/actions";
const idle = { status: "idle" as const, message: "" };
const fingerprint = "a".repeat(64);
function signup(consent = true) { const form = new FormData(); form.set("email", "reader@example.invalid"); if (consent) form.set("consent", "yes"); return form; }
function confirm(token: string) { const form = new FormData(); form.set("token", token); return form; }
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("NEWSLETTER_SIGNUP_ENABLED", "true"); vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://site.example");
  mocks.key.mockResolvedValue(fingerprint); mocks.admin.mockReturnValue({ rpc: mocks.rpc }); mocks.config.mockReturnValue({ kind: "mock" }); mocks.send.mockResolvedValue(undefined);
  mocks.rpc.mockImplementation(async (name: string) => ({ data: name === "newsletter_confirm_verified" ? "activated" : true, error: null }));
});
afterEach(() => vi.unstubAllEnvs());
describe("newsletter server actions", () => {
  it("remains disabled without the explicit flag", async () => {
    vi.stubEnv("NEWSLETTER_SIGNUP_ENABLED", "false");
    expect((await subscribeNewsletter(idle, signup())).status).toBe("error");
    expect((await confirmNewsletter(idle, confirm("a".repeat(64)))).status).toBe("error");
    expect(mocks.admin).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
  });
  it("requires consent before creating a pending request or sending", async () => {
    expect((await subscribeNewsletter(idle, signup(false))).status).toBe("error");
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
  });
  it("limits requests before storing and sends a token whose hash is stored", async () => {
    expect(await subscribeNewsletter(idle, signup())).toEqual({status:"success",message:"Please check your email for a confirmation link to proceed with your request."});
    expect(mocks.rpc.mock.calls[0]).toEqual(["form_rate_limit", { p_scope: "newsletter", p_fingerprint: fingerprint }]);
    const pending = mocks.rpc.mock.calls[1][1];
    const message = mocks.send.mock.calls[0][0];
    const url = new URL(message.text.match(/https:\/\/site\.example\/newsletter\/confirm\?token=[a-f0-9]+/)[0]);
    const hash = createHash("sha256").update(url.searchParams.get("token")!).digest("hex");
    expect(pending.p_confirmation_hash).toBe(hash); expect(JSON.stringify(pending)).not.toContain(url.searchParams.get("token"));
  });
  it("fails closed if rate limiting is denied or unavailable", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: false, error: null });
    expect((await subscribeNewsletter(idle, signup())).status).toBe("error"); expect(mocks.rpc).toHaveBeenCalledTimes(1); expect(mocks.send).not.toHaveBeenCalled();
    mocks.key.mockRejectedValueOnce(new Error("missing trusted IP"));
    expect((await subscribeNewsletter(idle, signup())).status).toBe("error"); expect(mocks.send).not.toHaveBeenCalled();
  });
  it("does not send if address cooldown denies a request", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: false, error: null });
    expect((await subscribeNewsletter(idle, signup())).status).toBe("success"); expect(mocks.send).not.toHaveBeenCalled();
  });
  it("returns an error on mail failure without another provider attempt", async () => {
    mocks.send.mockRejectedValueOnce(new Error("smtp error"));
    expect((await subscribeNewsletter(idle, signup())).status).toBe("error"); expect(mocks.send).toHaveBeenCalledTimes(1);
  });
  it("confirms only valid tokens through the limiter and a hashed token RPC", async () => {
    expect((await confirmNewsletter(idle, confirm("invalid"))).status).toBe("error"); expect(mocks.rpc).not.toHaveBeenCalled();
    const token = "f".repeat(64);
    expect((await confirmNewsletter(idle, confirm(token))).status).toBe("success");
    expect(mocks.rpc.mock.calls[1]).toEqual(["newsletter_confirm_verified", { p_confirmation_hash: createHash("sha256").update(token).digest("hex") }]);
  });
});
