import "server-only";
import nodemailer from "nodemailer";
import { absoluteUrl } from "./site";
import { emailShell } from "./auth-mail-hook";

export type NewsletterMessage = {
  email: string;
  unsubscribeToken: string;
  managementOtp: string;
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function transporter() {
  const port = Number(process.env.NEWSLETTER_SMTP_PORT ?? "465");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid NEWSLETTER_SMTP_PORT");
  return nodemailer.createTransport({
    host: required("NEWSLETTER_SMTP_HOST"),
    port,
    secure: process.env.NEWSLETTER_SMTP_SECURE ? process.env.NEWSLETTER_SMTP_SECURE === "true" : port === 465,
    auth: { user: required("NEWSLETTER_SMTP_USER"), pass: required("NEWSLETTER_SMTP_PASSWORD") },
  });
}

export function newsletterEmailTemplate(message: NewsletterMessage) {
  const unsubscribeUrl = absoluteUrl(`/newsletter/unsubscribe?token=${encodeURIComponent(message.unsubscribeToken)}`);
  const email = escapeHtml(message.email);
  const otp = escapeHtml(message.managementOtp);
  return {
    subject: "You’re on the EPE LAWA newsletter",
    text: [
      "You’re subscribed to the EPE LAWA newsletter.",
      "",
      `Management code: ${message.managementOtp}`,
      "Keep this code if you need to manage your subscription.",
      "",
      `Unsubscribe: ${unsubscribeUrl}`,
      "",
      "EPE LAWA — Rooted in Epe. Connected everywhere.",
    ].join("\n"),
    html: emailShell("You’re on the EPE LAWA newsletter", `
      <p style="margin:0 0 16px;line-height:1.6">Thanks for subscribing with <strong>${email}</strong>. We’ll send reporting and updates from Epe and its communities.</p>
      <div style="margin:0 0 16px;padding:18px;border-radius:14px;background:#e9eff9">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;color:#294b91">Your management code</p>
        <strong style="font-size:24px;letter-spacing:.18em">${otp}</strong>
        <p style="margin:8px 0 0;font-size:12px;color:#52617a">Keep it private. You do not need to verify your email to subscribe.</p>
      </div>
      <p style="margin:0;line-height:1.6">To stop receiving these emails, <a href="${unsubscribeUrl}" style="color:#294b91;font-weight:700">unsubscribe here</a>.</p>`, "You subscribed on the EPE LAWA website."),
  };
}

export async function sendNewsletterConfirmation(message: NewsletterMessage): Promise<void> {
  const content = newsletterEmailTemplate(message);
  await transporter().sendMail({
    from: required("NEWSLETTER_FROM"),
    to: message.email,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
}
