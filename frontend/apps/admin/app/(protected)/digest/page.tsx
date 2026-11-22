import { EmptyPanel, Notice, PageFrame, PageIntro, Panel, SectionHeading } from "@epelawa/ui";
import { createStaffClient } from "../../../lib/supabase";
import { digestSmtpConfigured } from "../../../../main/lib/digest-mailer";
import DigestSendForm from "./send-form";

export const dynamic = "force-dynamic";

type DigestSnapshot = {
  generated_at: string;
  articles: { title: string; slug: string; summary: string | null; published_at: string; url: string }[];
  events: { title: string; slug: string; venue: string | null; starts_at: string; url: string }[];
  poll: { id: string; question: string; ends_at: string | null } | null;
};

function digestText(snapshot: DigestSnapshot, origin: string): string {
  const lines: string[] = [];
  lines.push("EPE LAWA — This week in Epe Division");
  lines.push("");
  if (snapshot.articles.length) {
    lines.push("NEW STORIES");
    for (const article of snapshot.articles) {
      lines.push(`- ${article.title}${article.summary ? ` — ${article.summary}` : ""}`);
      lines.push(`  ${origin}${article.url}`);
    }
    lines.push("");
  }
  if (snapshot.events.length) {
    lines.push("UPCOMING COMMUNITY EVENTS");
    for (const event of snapshot.events) {
      lines.push(`- ${event.title}${event.venue ? ` at ${event.venue}` : ""} — ${new Date(event.starts_at).toLocaleString("en-NG", { dateStyle: "full", timeStyle: "short" })}`);
    }
    lines.push(`  ${origin}/events`);
    lines.push("");
  }
  if (snapshot.poll) {
    lines.push("SITE POLL RUNNING");
    lines.push(`- ${snapshot.poll.question}`);
    lines.push(`  ${origin}/`);
    lines.push("");
  }
  if (lines[lines.length - 1] === "") lines.pop();
  lines.push("");
  lines.push("You receive this because you subscribed at the EPE LAWA site.");
  lines.push(`${origin}/news`);
  return lines.join("\n");
}

export default async function DigestPage() {
  const db = await createStaffClient();
  const { data: allowed } = await db.rpc("has_capability", { p_capability: "article.publish" });
  if (allowed !== true) {
    return <PageFrame className="ui-stack">
      <PageIntro eyebrow="Newsroom · Staff" title="Email digest" description="Compose the weekly digest from what was actually published." />
      <Notice tone="danger" role="alert">The article.publish capability is required to compose digests.</Notice>
    </PageFrame>;
  }

  const { data, error } = await db.rpc("staff_digest_snapshot", { p_days: 7 });
  if (error || !data) {
    return <PageFrame className="ui-stack">
      <PageIntro eyebrow="Newsroom · Staff" title="Email digest" description="Compose the weekly digest from what was actually published." />
      <EmptyPanel title="Digest unavailable" description="Published content could not be gathered. Try again later." />
    </PageFrame>;
  }
  const snapshot = (typeof data === "string" ? JSON.parse(data) : data) as DigestSnapshot;
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  const origin = configuredOrigin && /^https:\/\//.test(configuredOrigin) ? configuredOrigin.replace(/\/$/, "") : "https://epelawa.com";
  const text = digestText(snapshot, origin);

  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="Newsroom · Staff" title="Email digest" description="A mail-ready digest of the last 7 days: new stories, upcoming events and the running site poll. Copy the text outward, or send it to active newsletter subscribers directly." />
    <section className="ui-stack-sm">
      <SectionHeading eyebrow="Preview" title="Digest contents" description={`Generated from live published content on ${new Date(snapshot.generated_at).toLocaleString("en-NG")}.`} />
      <div className="ui-stack-sm">
        <Panel className="ui-stack-sm">
          <h2 className="ui-item-title">Stories ({snapshot.articles.length})</h2>
          {snapshot.articles.length
            ? <ul className="ui-list">{snapshot.articles.map((article) => <li key={article.slug}><span>{article.title}</span> <span className="ui-meta">{new Date(article.published_at).toLocaleDateString("en-NG")}</span></li>)}</ul>
            : <p className="ui-meta">No stories were published in the last 7 days.</p>}
        </Panel>
        <Panel className="ui-stack-sm">
          <h2 className="ui-item-title">Events ({snapshot.events.length})</h2>
          {snapshot.events.length
            ? <ul className="ui-list">{snapshot.events.map((event) => <li key={event.slug}><span>{event.title}</span> <span className="ui-meta">{new Date(event.starts_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</span></li>)}</ul>
            : <p className="ui-meta">No upcoming published events.</p>}
        </Panel>
        <Panel className="ui-stack-sm">
          <h2 className="ui-item-title">Site poll</h2>
          {snapshot.poll ? <p className="ui-prose">{snapshot.poll.question}</p> : <p className="ui-meta">No poll is running right now.</p>}
        </Panel>
      </div>
    </section>
    <section className="ui-stack-sm">
      <SectionHeading eyebrow="Mail-ready" title="Plain-text digest" description="Copy this into an email. Links are absolute so they open from any mail client." />
      <textarea className="input" readOnly rows={Math.min(Math.max(text.split("\n").length + 2, 10), 40)} defaultValue={text} aria-label="Digest plain text" />
    </section>
    <section className="ui-stack-sm">
      <SectionHeading eyebrow="Delivery" title="Send the digest" description={digestSmtpConfigured() ? "Newsletter SMTP is configured for this environment." : "Newsletter SMTP is not configured yet; sending stays disabled and the text copy above remains the way out."} />
      <Panel className="ui-stack-sm"><DigestSendForm /></Panel>
    </section>
  </PageFrame>;
}
