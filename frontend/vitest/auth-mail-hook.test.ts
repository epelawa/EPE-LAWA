import { describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { deliverAuthMessage, renderAuthMessages, verifyAuthMail } from "../apps/main/lib/auth-mail-hook";
import { POST } from "../apps/main/app/api/auth/send-email/route";
const secret = `whsec_${Buffer.alloc(32, 42).toString("base64")}`;
const payload = { user: { email: "reader@example.invalid", new_email: "new@example.invalid" }, email_data: { token: "12345678", token_hash: "a".repeat(64), redirect_to: "https://site.example/auth/callback?next=%2Fdashboard", email_action_type: "signup", token_new: "", token_hash_new: "" } };
function signed(body: string, date = new Date()) { const timestamp = String(Math.floor(date.getTime() / 1000)); return { "webhook-id": "msg_test", "webhook-timestamp": timestamp, "webhook-signature": `v1,${createHmac("sha256", Buffer.alloc(32, 42)).update(`msg_test.${timestamp}.${body}`).digest("base64")}` }; }
const render = (p: unknown) => renderAuthMessages(p, "https://project.example", "https://site.example");
describe("auth email hook", () => {
  it("verifies signature, rejects tampering, missing signatures and stale messages", () => {
    const body = JSON.stringify(payload);
    expect(verifyAuthMail(body, signed(body), `v1,${secret}`)).toEqual(payload);
    expect(() => verifyAuthMail(body + " ", signed(body), secret)).toThrow();
    expect(() => verifyAuthMail(body, {}, secret)).toThrow();
    expect(() => verifyAuthMail(body, signed(body, new Date(Date.now() - 600_000)), secret)).toThrow();
  });
  it("renders branded OTP and a URL to the configured Supabase project", () => {
    const [message] = render(payload);
    expect(message.to).toBe("reader@example.invalid"); expect(message.text).toContain("12345678");
    expect(message.html).toContain("EPE LAWA");
    expect(message.text).toContain("https://project.example/auth/v1/verify?");
    expect(message.text).toContain("redirect_to=https%3A%2F%2Fsite.example");
    expect(render(payload)[0].idempotencyKey).toBe(message.idempotencyKey);
  });
  it("maps secure email changes to the correct token and hash for each recipient", () => {
    const change = { ...payload, email_data: { ...payload.email_data, email_action_type: "email_change", token_new: "87654321", token_hash_new: "b".repeat(64) } };
    const [old, next] = render(change);
    expect(old.to).toBe("reader@example.invalid"); expect(old.text).toContain("12345678"); expect(old.text).toContain("b".repeat(64));
    expect(next.to).toBe("new@example.invalid"); expect(next.text).toContain("87654321"); expect(next.text).toContain("a".repeat(64));
    expect(old.idempotencyKey).not.toBe(next.idempotencyKey);
  });
  it("rejects unknown actions, invalid tokens, and off-site redirects", () => {
    for (const change of [{ email_action_type: "__proto__" }, { token: "<script>" }, { redirect_to: "https://evil.example" }]) expect(() => render({ ...payload, email_data: { ...payload.email_data, ...change } })).toThrow();
  });
  it("sends through the fixed provider and fails on rejection", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    const message = render(payload)[0];
    await deliverAuthMessage(message, { apiKey: "synthetic-key", from: "EPE LAWA <auth@example.invalid>" }, fetcher);
    expect(fetcher.mock.calls[0][0]).toBe("https://api.resend.com/emails");
    expect(fetcher.mock.calls[0][1].headers["Idempotency-Key"]).toBe(message.idempotencyKey);
    await expect(deliverAuthMessage(message, { apiKey: "synthetic", from: "auth@example.invalid" }, vi.fn().mockResolvedValue(new Response("bad", { status: 403 })))).rejects.toThrow();
  });
  it("rejects forged requests before contacting the provider and returns provider errors", async () => {
    vi.stubEnv("AUTH_EMAIL_HOOK_SECRET", secret); vi.stubEnv("RESEND_API_KEY", "synthetic"); vi.stubEnv("AUTH_EMAIL_FROM", "auth@example.invalid"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.example"); vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://site.example");
    const fetcher = vi.fn().mockResolvedValue(new Response("bad", { status: 403 })); vi.stubGlobal("fetch", fetcher);
    const body = JSON.stringify(payload);
    expect((await POST(new Request("https://site.example/api/auth/send-email", { method: "POST", body }))).status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
    expect((await POST(new Request("https://site.example/api/auth/send-email", { method: "POST", body, headers: signed(body) }))).status).toBe(503);
    vi.unstubAllEnvs(); vi.unstubAllGlobals();
  });
});
