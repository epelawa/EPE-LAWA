import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { requestNewsletterConfirmation } from "../apps/main/lib/newsletter-confirmation";
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const input = { email: "  Reader@Example.invalid  ", consent: true, clientKey: "a".repeat(64), origin: "https://site.example" };
const deps = () => ({ allow: vi.fn().mockResolvedValue(true), createPending: vi.fn().mockResolvedValue(true), send: vi.fn().mockResolvedValue(undefined) });
describe("newsletter confirmation building block", () => {
  it("requires explicit consent and trusted client identity", async () => {
    const d = deps();
    expect(await requestNewsletterConfirmation({ ...input, consent: false }, d)).toBe("invalid");
    expect(await requestNewsletterConfirmation({ ...input, clientKey: "untrusted" }, d)).toBe("invalid");
    expect(d.createPending).not.toHaveBeenCalled(); expect(d.send).not.toHaveBeenCalled();
  });
  it("sends only after pending storage, with independent random tokens and hashes", async () => {
    const d = deps(); expect(await requestNewsletterConfirmation(input, d)).toBe("accepted");
    const pending = d.createPending.mock.calls[0][0], message = d.send.mock.calls[0][0];
    const urls = message.text.match(/https:\/\/[^\s]+/g)!;
    const confirmation = new URL(urls[0]).searchParams.get("token")!, unsubscribe = new URL(urls[1]).searchParams.get("token")!;
    expect(confirmation).toMatch(/^[a-f0-9]{64}$/); expect(unsubscribe).toMatch(/^[a-f0-9]{64}$/);
    expect(confirmation).not.toBe(unsubscribe); expect(pending.confirmationHash).toBe(sha(confirmation)); expect(pending.unsubscribeHash).toBe(sha(unsubscribe));
    expect(JSON.stringify(pending)).not.toContain(confirmation); expect(message.to).toBe("reader@example.invalid");
    expect(d.createPending.mock.invocationCallOrder[0]).toBeLessThan(d.send.mock.invocationCallOrder[0]);
  });
  it("fails closed on abuse limit, invalid origin and provider failure", async () => {
    const d = deps(); d.allow.mockResolvedValueOnce(false); expect(await requestNewsletterConfirmation(input, d)).toBe("limited"); expect(d.createPending).not.toHaveBeenCalled();
    expect(await requestNewsletterConfirmation({ ...input, origin: "http://site.example" }, d)).toBe("unavailable");
    d.send.mockRejectedValueOnce(new Error("synthetic failure")); expect(await requestNewsletterConfirmation(input, d)).toBe("unavailable");
  });
  it("does not send again when the per-address cooldown applies", async () => {
    const d = deps(); d.createPending.mockResolvedValue(false);
    expect(await requestNewsletterConfirmation(input, d)).toBe("accepted"); expect(d.send).not.toHaveBeenCalled();
  });
});
