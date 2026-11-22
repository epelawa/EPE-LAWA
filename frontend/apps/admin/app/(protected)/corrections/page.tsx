import Link from "next/link";
import { EmptyPanel, Notice, PageFrame, PageIntro, Panel, SectionHeading, StatusBadge } from "@epelawa/ui";
import { adminHref } from "../../../lib/admin-path";
import { createStaffClient } from "../../../lib/supabase";
import { resolveCorrection } from "./actions";

export const dynamic = "force-dynamic";

type Report = {
  id: string;
  reason: string;
  status: string;
  resolution_note: string | null;
  created_at: string;
  articles: { slug: string } | null;
};

export default async function Page({ searchParams }: { searchParams: Promise<{ resolved?: string; dismissed?: string; error?: string }> }) {
  const p = await searchParams;
  const db = await createStaffClient();
  const { data: allowed, error: ge } = await db.rpc("has_capability", { p_capability: "article.review" });
  if (ge || allowed !== true) return <PageFrame className="ui-stack"><PageIntro eyebrow="Newsroom · Staff" title="Correction reports" description="Reader-reported corrections on published stories." /><Notice tone="danger" role="alert">Article review capability is required to read correction reports.</Notice></PageFrame>;
  const { data, error } = await db.from("article_correction_reports").select("id,article_id,reason,status,resolution_note,created_at,articles(slug)").order("created_at", { ascending: false }).limit(100);
  const rows = (data ?? []) as unknown as Report[];
  const open = rows.filter((r) => r.status === "open");
  const handled = rows.filter((r) => r.status !== "open");
  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="Newsroom · Staff" title="Correction reports" description="Readers report factual errors on published stories. Review each report, then resolve it with a correction note or dismiss it." />
    {p.resolved ? <Notice tone="success" role="status">Correction recorded as resolved.</Notice> : null}
    {p.dismissed ? <Notice tone="success" role="status">Correction dismissed.</Notice> : null}
    {p.error ? <Notice tone="danger" role="alert">Correction action failed. Confirm capability and decision, then retry.</Notice> : null}
    {error ? <EmptyPanel title="Reports unavailable" description="Correction reports could not be loaded. Try again later." /> : !rows.length ? <EmptyPanel title="No correction reports yet" description="When readers report an error on a published story, the report appears here." /> : <div className="ui-stack">
      <section className="ui-stack-sm">
        <SectionHeading eyebrow="Open" title="Awaiting decision" description="Each report needs a recorded decision before it leaves this queue." />
        {open.length ? <ul className="ui-list ui-stack-sm">{open.map((r) => <li key={r.id}><Panel className="ui-stack-sm">
          <div className="ui-row"><StatusBadge tone="warning">open</StatusBadge><span className="ui-meta">Filed {new Date(r.created_at).toLocaleString("en-NG")}{r.articles?.slug ? <> · <Link href={`/news/${r.articles.slug}`} className="ui-text-link">Open article</Link></> : null}</span></div>
          <p className="ui-prose">{r.reason}</p>
          <form action={resolveCorrection} className="ui-stack-sm ui-divider">
            <input type="hidden" name="report_id" value={r.id} />
            <div className="ui-form-grid">
              <label className="ui-field"><span className="label">Decision</span><select name="status" required defaultValue="resolved" className="input"><option value="resolved">Resolved — a correction was made</option><option value="dismissed">Dismissed — no correction needed</option></select></label>
              <label className="ui-field"><span className="label">Resolution note (required when resolved, at least 2 characters)</span><textarea name="note" minLength={2} maxLength={2000} className="input" /></label>
            </div>
            <button className="btn-primary" type="submit">Record decision</button>
          </form>
        </Panel></li>)}</ul> : <EmptyPanel title="Queue is clear" description="No correction reports are awaiting a decision." />}
      </section>
      {handled.length ? <section className="ui-stack-sm">
        <SectionHeading eyebrow="History" title="Recently handled" description="Decisions already recorded on correction reports." />
        <ul className="ui-list ui-stack-sm">{handled.map((r) => <li key={r.id}><Panel className="ui-stack-sm">
          <div className="ui-row"><StatusBadge tone={r.status === "resolved" ? "success" : "neutral"}>{r.status}</StatusBadge><span className="ui-meta">Filed {new Date(r.created_at).toLocaleString("en-NG")}{r.articles?.slug ? <> · <Link href={`/news/${r.articles.slug}`} className="ui-text-link">Open article</Link></> : null}</span></div>
          <p className="ui-prose">{r.reason}</p>
          {r.resolution_note ? <p className="ui-meta"><strong>Resolution:</strong> {r.resolution_note}</p> : null}
        </Panel></li>)}</ul>
      </section> : null}
    </div>}
  </PageFrame>;
}
