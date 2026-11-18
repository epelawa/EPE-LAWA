import { Webhook } from "standardwebhooks";
import { createHash } from "node:crypto";
import nodemailer from "nodemailer";

type Message = { to: string; subject: string; text: string; html: string; idempotencyKey: string };
type RecordValue = Record<string, unknown>;
const subjects: Record<string, string> = {
  signup: "Confirm your EPE LAWA account", recovery: "Reset your EPE LAWA password",
  invite: "Your EPE LAWA invitation", magiclink: "Your EPE LAWA sign-in link",
  email_change: "Confirm your EPE LAWA email change", reauthentication: "Your EPE LAWA verification code",
};
function record(v: unknown): RecordValue { if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("invalid payload"); return v as RecordValue; }
function str(v: unknown): string { if (typeof v !== "string") throw new Error("invalid payload"); return v; }
function email(v: unknown): string { const s = str(v); if (s.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s)) throw new Error("invalid email"); return s; }
function escape(s: string): string { return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)); }

/** Verify before inspecting any user input; the library enforces a five-minute timestamp window. */
export function verifyAuthMail(body: string, headers: Record<string, string>, secret: string): unknown {
  const key = secret.startsWith("v1,") ? secret.slice(3) : secret;
  if (!/^whsec_[A-Za-z0-9+/]+={0,2}$/.test(key) || Buffer.from(key.slice(6), "base64").length < 24) throw new Error("invalid secret");
  return new Webhook(key).verify(body, headers);
}

/** Render all supported Auth actions, including both secure-email-change recipients. */
export function renderAuthMessages(payload: unknown, projectUrl: string, allowedOrigin: string): Message[] {
  const root = record(payload), user = record(root.user), data = record(root.email_data);
  const action = str(data.email_action_type);
  if (!Object.hasOwn(subjects, action)) throw new Error("unsupported action");
  const project = new URL(projectUrl), allowed = new URL(allowedOrigin);
  if (project.protocol !== "https:" || project.username || project.password || project.pathname !== "/" || project.search || project.hash || allowed.protocol !== "https:" || allowed.username || allowed.password || allowed.pathname !== "/" || allowed.search || allowed.hash) throw new Error("invalid configuration");
  const redirect = action === "reauthentication" ? null : new URL(str(data.redirect_to));
  if (redirect && (redirect.origin !== allowed.origin || redirect.username || redirect.password)) throw new Error("invalid redirect");
  const make = (recipient: string, token: unknown, hash: unknown): Message => {
    const code = str(token);
    if (!/^\d{6,8}$/.test(code)) throw new Error("invalid token");
    let link = "";
    if (action !== "reauthentication") {
      const h = str(hash);
      if (!/^[a-f0-9]{32,128}$/i.test(h)) throw new Error("invalid token hash");
      const url = new URL("/auth/v1/verify", project.origin);
      url.search = new URLSearchParams({ token: h, type: action, redirect_to: redirect!.href }).toString();
      link = url.href;
    }
    const subject = subjects[action];
    const text = `${subject}\n\nYour verification code: ${code}${link ? `\n\nContinue securely: ${link}` : ""}\n\nIf you did not request this, you can ignore this email.\n\nEPE LAWA`;
    const html = `<div style="font-family:Arial,sans-serif;color:#17264a;max-width:560px;margin:auto;padding:32px"><p style="color:#294b91;font-weight:bold">EPE LAWA</p><h1>${escape(subject)}</h1><p>Your verification code:</p><p style="font-size:28px;font-weight:bold;letter-spacing:4px">${escape(code)}</p>${link ? `<p><a href="${escape(link)}">Continue securely</a></p>` : ""}<p>If you did not request this, you can ignore this email.</p></div>`;
    // Stable across hook retries, distinct across recipients and token pairs; never log it.
    const idempotencyKey = `auth/${createHash("sha256").update(JSON.stringify([action, recipient, code, hash])).digest("hex")}`;
    return { to: recipient, subject, text, html, idempotencyKey };
  };
  if (action !== "email_change") return [make(email(user.email), data.token, data.token_hash)];
  const newEmail = email(user.new_email);
  if (data.token_new && data.token_hash_new) return [make(email(user.email), data.token, data.token_hash_new), make(newEmail, data.token_new, data.token_hash)];
  return [make(newEmail, data.token || data.token_new, data.token_hash)];
}

export async function deliverResendAuthMessage(message: Message, config: { apiKey: string; from: string }, fetcher: typeof fetch = fetch): Promise<void> {
  if (!config.apiKey || !config.from || /[\r\n]/.test(config.from)) throw new Error("missing mail configuration");
  const response = await fetcher("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json", "Idempotency-Key": message.idempotencyKey },
    body: JSON.stringify({ from: config.from, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("mail provider rejected request");
}

export type AuthMailConfig =
  | { kind: "gmail"; user: string; password: string; from: string }
  | { kind: "resend"; apiKey: string; from: string };

/** Choose Gmail when configured; only use Resend when Gmail is wholly absent.
 * Partial Gmail configuration is an error, not permission to change providers. */
export function authMailConfig(env: NodeJS.ProcessEnv): AuthMailConfig {
  const from = env.AUTH_EMAIL_FROM?.trim();
  const user = env.AUTH_GMAIL_USER?.trim();
  const password = env.AUTH_GMAIL_APP_PASSWORD;
  if (!from || /[\r\n]/.test(from)) throw new Error("missing sender");
  if (user || password) {
    if (!user || !password || /[\r\n]/.test(user)) throw new Error("incomplete Gmail configuration");
    return { kind: "gmail", user, password, from };
  }
  if (!env.RESEND_API_KEY?.trim()) throw new Error("missing mail provider");
  return { kind: "resend", apiKey: env.RESEND_API_KEY.trim(), from };
}

/** SMTP has no provider-level idempotency guarantee. Never fall back after a
 * send error: the server might already have accepted the message. */
export async function deliverAuthMessage(message: Message, config: AuthMailConfig): Promise<void> {
  if (config.kind === "resend") return deliverResendAuthMessage(message, config);
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com", port: 465, secure: true,
    auth: { user: config.user, pass: config.password },
    connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 8000,
  });
  try {
    const result = await transport.sendMail({ from: config.from, to: message.to, subject: message.subject, text: message.text, html: message.html });
    if (!result.accepted.length || result.rejected.length) throw new Error("mail provider rejected request");
  } finally { transport.close(); }
}
