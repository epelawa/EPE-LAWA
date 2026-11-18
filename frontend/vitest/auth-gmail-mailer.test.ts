import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ sendMail: vi.fn(), close: vi.fn(), createTransport: vi.fn() }));
vi.mock("../apps/main/node_modules/nodemailer", () => ({ default: { createTransport: mock.createTransport } }));
import { authMailConfig, deliverAuthMessage, renderAuthMessages } from "../apps/main/lib/auth-mail-hook";
const gmail = { AUTH_EMAIL_FROM: "EPE LAWA <sender@gmail.com>", AUTH_GMAIL_USER: "sender@gmail.com", AUTH_GMAIL_APP_PASSWORD: "synthetic-password", RESEND_API_KEY: "synthetic-resend" };
const message = renderAuthMessages({ user: { email: "reader@example.invalid" }, email_data: { email_action_type: "signup", token: "12345678", token_hash: "a".repeat(64), redirect_to: "https://site.example/dashboard" } }, "https://project.example", "https://site.example")[0];
beforeEach(() => { mock.createTransport.mockReset(); mock.sendMail.mockReset(); mock.close.mockReset(); mock.createTransport.mockReturnValue({ sendMail: mock.sendMail, close: mock.close }); });
describe("auth delivery provider selection", () => {
  it("prefers configured Gmail; uses Resend only when Gmail is absent", () => {
    expect(authMailConfig(gmail)).toMatchObject({ kind: "gmail", user: "sender@gmail.com" });
    expect(authMailConfig({ AUTH_EMAIL_FROM: gmail.AUTH_EMAIL_FROM, RESEND_API_KEY: "synthetic" })).toMatchObject({ kind: "resend" });
    expect(() => authMailConfig({ ...gmail, AUTH_GMAIL_APP_PASSWORD: "" })).toThrow();
    expect(() => authMailConfig({ AUTH_EMAIL_FROM: gmail.AUTH_EMAIL_FROM })).toThrow();
  });
  it("sends through TLS-protected Gmail SMTP", async () => {
    mock.sendMail.mockResolvedValue({ accepted: [message.to], rejected: [] });
    await deliverAuthMessage(message, authMailConfig(gmail));
    expect(mock.createTransport).toHaveBeenCalledWith(expect.objectContaining({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: gmail.AUTH_GMAIL_USER, pass: gmail.AUTH_GMAIL_APP_PASSWORD } }));
    expect(mock.sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: message.to, text: message.text }));
    expect(mock.close).toHaveBeenCalledOnce();
  });
  it("fails on SMTP error or rejection without sending through Resend", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch");
    mock.sendMail.mockRejectedValueOnce(new Error("transport failure"));
    await expect(deliverAuthMessage(message, authMailConfig(gmail))).rejects.toThrow();
    mock.sendMail.mockResolvedValueOnce({ accepted: [], rejected: [message.to] });
    await expect(deliverAuthMessage(message, authMailConfig(gmail))).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled(); expect(mock.close).toHaveBeenCalledTimes(2);
  });
});
