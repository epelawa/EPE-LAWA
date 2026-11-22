import Link from "next/link";
import { EmptyPanel, Notice, PageFrame, PageIntro, Panel, SectionHeading } from "@epelawa/ui";
import { adminHref } from "../../../lib/admin-path";
import { createClient } from "../../../lib/supabase";
import { saveSitePoll } from "../../../lib/actions";

export const dynamic = "force-dynamic";

type PollRow = { id: string; question: string; status: string; ends_at: string | null; created_at: string };
type OptionRow = { id: string; label: string };
type ResultRow = { option_id: string; label: string; votes: number };

export default async function PollPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const query = await searchParams;
  const db = await createClient();
  const { data: allowed } = await db.rpc("has_capability", { p_capability: "article.publish" });
  if (allowed !== true) {
    return <PageFrame className="ui-stack">
      <PageIntro eyebrow="Community · Staff" title="Site poll" description="Publish the single active poll shown on the homepage." />
      <Notice tone="danger" role="alert">Article publish capability is required to open a site poll.</Notice>
    </PageFrame>;
  }

  const { data: polls } = await db.from("site_polls").select("id,question,status,ends_at,created_at").order("created_at", { ascending: false }).limit(5);
  const pollRows = (polls ?? []) as PollRow[];
  const activePoll = pollRows.find((poll) => poll.status === "active" && (!poll.ends_at || poll.ends_at > new Date().toISOString())) ?? null;
  const { data: activeOptions } = activePoll
    ? await db.from("site_poll_options").select("id,label").eq("poll_id", activePoll.id).order("sort_order", { ascending: true })
    : { data: [] };
  const { data: results } = activePoll
    ? await db.rpc("site_poll_results", { p_poll_id: activePoll.id })
    : { data: [] };
  const optionRows = (activeOptions ?? []) as OptionRow[];
  const resultRows = (results ?? []) as ResultRow[];
  const counts = new Map(resultRows.map((row) => [row.option_id, Number(row.votes)]));
  const total = resultRows.reduce((sum, row) => sum + Number(row.votes), 0);

  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="Community · Staff" title="Site poll" description="One question at a time runs on the homepage. Opening a new poll closes the previous one." />
    {query.saved ? <Notice tone="success" role="status">The poll is live on the homepage.</Notice> : null}
    {query.error ? <Notice tone="danger" role="alert">The poll needs a question of 6–200 characters, 2–6 options and a run of 1–90 days.</Notice> : null}

    {activePoll ? <Panel className="ui-subtle">
      <div className="ui-stack-sm">
        <SectionHeading eyebrow="Now running" title={activePoll.question} description={`Opened ${new Date(activePoll.created_at).toLocaleDateString("en-NG")}${activePoll.ends_at ? ` · closes ${new Date(activePoll.ends_at).toLocaleString("en-NG")}` : " · no end date"}`} />
        <ul className="ui-list">{optionRows.map((option) => {
          const count = counts.get(option.id) ?? 0;
          const share = total > 0 ? Math.round((count / total) * 100) : 0;
          return <li key={option.id} className="ui-item"><div className="ui-row"><span>{option.label}</span><span className="ui-meta">{share}% · {count}</span></div></li>;
        })}</ul>
        <p className="ui-meta">{total} {total === 1 ? "member has" : "members have"} voted so far.</p>
        <p className="ui-meta"><Link className="ui-text-link" href="/">See it on the homepage</Link></p>
      </div>
    </Panel> : <EmptyPanel title="No active poll" description="Open a poll below and it appears instantly on the homepage." />}

    <Panel className="ui-subtle">
      <SectionHeading eyebrow="Publish" title="Open a new poll" description="Closing replaces the previous poll. Past polls keep their rows for the audit trail." />
      <form action={saveSitePoll} className="ui-stack">
        <label className="ui-field"><span className="label">Question (6–200 characters)</span><input className="input" name="question" required minLength={6} maxLength={200} placeholder="e.g. Which community project matters most to you?" /></label>
        <div className="ui-form-grid">
          {[1, 2, 3, 4, 5, 6].map((slot) => <label key={slot} className="ui-field"><span className="label">Option {slot}{slot <= 2 ? " (required)" : " (optional)"}</span><input className="input" name="options" maxLength={120} required={slot <= 2} /></label>)}
        </div>
        <label className="ui-field"><span className="label">Run for (days)</span><input className="input" name="days" type="number" min={1} max={90} defaultValue={7} required /></label>
        <div className="ui-actions"><button className="btn-primary w-fit" type="submit">Publish poll</button></div>
      </form>
    </Panel>

    {pollRows.length ? <section className="ui-stack-sm">
      <SectionHeading eyebrow="History" title="Recent polls" description="Most recently opened polls, active first." />
      <ul className="ui-list">{pollRows.map((poll) => <li key={poll.id} className="ui-item"><div className="ui-row"><span>{poll.question}</span><span className="ui-meta">{poll.status === "active" ? "active" : "closed"} · {new Date(poll.created_at).toLocaleDateString("en-NG")}</span></div></li>)}</ul>
    </section> : null}
  </PageFrame>;
}
