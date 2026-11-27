import "server-only";
import { createClient } from "@supabase/supabase-js";
import { emailShell } from "./auth-mail-hook";
import { transporter } from "./newsletter-mailer";

/**
 * Weekly digest auto-send. The service-role client is required because
 * newsletter_subscribers has no grants for end-user roles: only the server may
 * read the recipient list, and only the staff capability gates who may trigger
 * the send. Nothing is invented: the snapshot comes from staff_digest_snapshot,
 * the recipient list from the subscription table, and every failure is counted,
 * never hidden.
 */

const MAX_RECIPIENTS = 500;
const EMAIL_PATTERN = /^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$/;

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character] ?? character));
}

export type DigestSnapshot = {
  generated_at: string;
  articles: { title: string; slug: string; summary: string | null; published_at: string; url: string }[];
  events: { title: string; slug: string; venue: string | null; starts_at: string; url: string }[];
  poll: { id: string; question: string; ends_at: string | null } | null;
};

export type DigestSendResult =
  | { state: "ok"; sent: number; failedCount: number; recipients: number }
  | { state: "too_many"; recipients: number; max: number }
  | { state: "not_configured" }
  | { state: "unavailable" };

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

export function digestSmtpConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(
    env.NEWSLETTER_SMTP_HOST?.trim()
    && env.NEWSLETTER_SMTP_USER?.trim()
    && env.NEWSLETTER_SMTP_PASSWORD?.trim()
    && env.NEWSLETTER_FROM?.trim()
    && !/[\r\n]/.test(env.NEWSLETTER_FROM ?? ""),
  );
}

function digestLines(snapshot: DigestSnapshot, origin: string): string[] {
  const lines: string[] = [];
  lines.push("HERE IS WHAT HAPPENED AROUND EPE THIS WEEK");
  lines.push("");
  if (snapshot.articles.length) {
    lines.push("NEW STORIES");
    for (const article of snapshot.articles) {
      lines.push(`• ${article.title}`);
      if (article.summary) lines.push(`  ${article.summary}`);
      lines.push(`  Read: ${origin}${article.url}`);
    }
    lines.push("");
  }
  if (snapshot.events.length) {
    lines.push("UPCOMING COMMUNITY EVENTS");
    for (const event of snapshot.events) {
      lines.push(`• ${event.title}${event.venue ? ` — ${event.venue}` : ""} · ${new Date(event.starts_at).toLocaleString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" })}`);
    }
    lines.push(`  See all: ${origin}/events`);
    lines.push("");
  }
  if (snapshot.poll) {
    lines.push("SITE POLL RUNNING: answer on the homepage");
    lines.push(`• ${snapshot.poll.question}`);
    lines.push(`  ${origin}/`);
    lines.push("");
  }
  lines.push("Rooted in Epe. Connected everywhere.");
  return lines;
}

export function digestEmailContent(snapshot: DigestSnapshot, origin: string): { subject: string; text: string } {
  const subject = "This week in Epe Division — EPE LAWA digest";
  const body = digestLines(snapshot, origin).join("\n");
  const text = [
    body,
    "",
    "You receive this because you subscribed at the EPE LAWA site.",
    "Unsubscribe with the private link in your signup confirmation email.",
    `${origin}/news`,
  ].join("\n");
  return { subject, text };
}

export function digestEmailHtml(snapshot: DigestSnapshot, origin: string): string {
  const sections: string[] = [];
  if (snapshot.articles.length) {
    const items = snapshot.articles.map((article) =>
      `<li style="margin:0 0 12px"><a href="${origin}${article.url}" style="color:#294b91;font-weight:700;text-decoration:none">${escapeHtml(article.title)}</a>${article.summary ? `<p style="margin:4px 0 0;color:#52617a">${escapeHtml(article.summary)}</p>` : ""}</li>`).join("");
    sections.push(`<h2 style="margin:0 0 10px;font-size:15px;letter-spacing:.08em;text-transform:uppercase;color:#52617a">New stories</h2><ul style="margin:0;padding:0 0 0 18px;list-style:disc">${items}</ul>`);
  }
  if (snapshot.events.length) {
    const items = snapshot.events.map((event) =>
      `<li style="margin:0 0 8px">${escapeHtml(event.title)}${event.venue ? ` — ${escapeHtml(event.venue)}` : ""} <span style="color:#52617a">· ${new Date(event.starts_at).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" })}</span></li>`).join("");
    sections.push(`<h2 style="margin:18px 0 10px;font-size:15px;letter-spacing:.08em;text-transform:uppercase;color:#52617a">Community events</h2><ul style="margin:0;padding:0 0 0 18px;list-style:disc">${items}</ul>`);
  }
  if (snapshot.poll) {
    sections.push(`<h2 style="margin:18px 0 10px;font-size:15px;letter-spacing:.08em;text-transform:uppercase;color:#52617a">Site poll</h2><p style="margin:0 0 10px">${escapeHtml(snapshot.poll.question)} <a href="${origin}/" style="color:#294b91;font-weight:700">Vote on the homepage</a></p>`);
  }
  return emailShell("This week in Epe Division", sections.join("") || "<p style=\"margin:0\">Nothing new was published in the last 7 days.</p>", "Unsubscribe with the private link in your signup confirmation email.");
}

export async function sendWeeklyDigest(origin: string): Promise<DigestSendResult> {
  if (!digestSmtpConfigured()) return { state: "not_configured" };
  const db = serviceClient();
  if (!db) return { state: "not_configured" };

  const { data: snapshotData, error: snapshotError } = await db.rpc("staff_digest_snapshot", { p_days: 7 });
  if (snapshotError || !snapshotData) return { state: "unavailable" };
  const snapshot = (typeof snapshotData === "string" ? JSON.parse(snapshotData) : snapshotData) as DigestSnapshot;

  const { data: subscriberRows, error: subscriberError } = await db
    .from("newsletter_subscribers")
    .select("email")
    .eq("status", "active")
    .order("subscribed_at", { ascending: true })
    .limit(MAX_RECIPIENTS + 1);
  if (subscriberError) return { state: "unavailable" };
  const recipients = ((subscriberRows ?? []) as { email: string }[]).map((row) => row.email);
  if (recipients.length > MAX_RECIPIENTS) return { state: "too_many", recipients: recipients.length, max: MAX_RECIPIENTS };

  const from = (process.env.NEWSLETTER_FROM ?? "").trim();
  const { subject, text } = digestEmailContent(snapshot, origin);
  const html = digestEmailHtml(snapshot, origin);
  let sent = 0;
  let failedCount = 0;
  const transport = transporter();
  try {
    for (const recipient of recipients) {
      if (!EMAIL_PATTERN.test(recipient)) { failedCount += 1; continue; }
      try {
        const result = await transport.sendMail({ from, to: recipient, subject, text, html });
        if (!result.accepted.length || result.rejected.length) throw new Error("rejected");
        sent += 1;
      } catch {
        failedCount += 1;
      }
    }
  } finally {
    transport.close();
  }
  return { state: "ok", sent, failedCount, recipients: recipients.length };
}
