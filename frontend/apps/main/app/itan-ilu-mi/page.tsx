import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { PageFrame, PageIntro, Panel, SectionHeading, EmptyPanel, Notice, StatusBadge } from "../../components/design-system";
import { submitHistoryContribution } from "./actions";

export const metadata: Metadata = {
  title: "Itan Ilu Mi",
  description: "Read approved, source-backed community history and contribute an account for private review.",
  alternates: { canonical: "/itan-ilu-mi" },
};

type RecordRow = { id: string; title: string; account: string; published_at: string; community: string | null; category: string; family_name: string | null; lineage_description: string | null };
type SourceRow = { id: string; record_id: string; citation: string; source_url: string | null };
const categories = ["community-history", "family-lineage", "cultural-practice", "place-history", "oral-history", "other"] as const;
const categoryLabels: Record<string, string> = { "community-history": "Community history", "family-lineage": "Family / house lineage", "cultural-practice": "Cultural practice", "place-history": "Place history", "oral-history": "Oral history", other: "Other" };

export default async function ItanIluMiPage({ searchParams }: { searchParams: Promise<{ contribution?: string; q?: string; category?: string }> }) {
  const params = await searchParams;
  const contributionState = params.contribution;
  const query = (params.q ?? "").trim().slice(0, 120);
  const category = categories.includes(params.category as typeof categories[number]) ? params.category : "";
  let records: RecordRow[] = [];
  let sources: SourceRow[] = [];
  let failed = false;
  let signedIn = false;
  try {
    const supabase = await createClient();
    let recordQuery = supabase.from("history_records").select("id,title,account,published_at,community,category,family_name,lineage_description");
    const safeQuery = query.replace(/[^\p{L}\p{N} '-]/gu, " ").trim();
    if (safeQuery) recordQuery = recordQuery.or(`family_name.ilike.%${safeQuery}%,community.ilike.%${safeQuery}%`);
    if (category) recordQuery = recordQuery.eq("category", category);
    const [recordsResult, authResult] = await Promise.all([
      recordQuery.order("published_at", { ascending: false }).limit(50),
      supabase.auth.getUser(),
    ]);
    if (recordsResult.error) {
      console.error("history public read failed", { code: recordsResult.error.code });
      failed = true;
    } else {
      records = (recordsResult.data ?? []) as RecordRow[];
      signedIn = Boolean(authResult.data.user);
      if (records.length) {
        const sourceResult = await supabase.from("history_record_sources").select("id,record_id,citation,source_url").in("record_id", records.map((record) => record.id)).limit(200);
        if (sourceResult.error) { console.error("history source read failed", { code: sourceResult.error.code }); failed = true; }
        else sources = (sourceResult.data ?? []) as SourceRow[];
      }
    }
  } catch { failed = true; }

  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="Community record" title="Ìtàn Ilú Mi" description="A community archive built from identifiable sources and reviewed contributions. Accounts are not published until evidence, consent and publication rights have been checked." meta={<span>Verified accounts · Private submissions</span>} />

    <form method="get" className="ui-toolbar" role="search">
      <div className="ui-field"><label className="label" htmlFor="history-search">Family name or community</label><input className="input" id="history-search" name="q" maxLength={120} value={query} /></div>
      <div className="ui-field"><label className="label" htmlFor="history-filter">Category</label><select className="input" id="history-filter" name="category" defaultValue={category}><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{categoryLabels[item]}</option>)}</select></div>
      <button className="btn-primary" type="submit">Search published records</button>
    </form>

    {failed ? <EmptyPanel title="History records could not be loaded" description="Please try again later. No archive content is shown while records or source notes cannot be verified." /> : records.length === 0 ? <EmptyPanel title={query || category ? "No published records match" : "No approved history records yet"} description="There are currently no published, source-backed accounts matching this search. We do not fill this space with unverified or invented history." /> : <section className="ui-stack" aria-labelledby="archive-heading">
      <SectionHeading eyebrow="The archive" title="Published accounts" description="Source-backed histories approved for public reading." id="archive-heading" />
      <ol className="ui-list ui-stack-sm">{records.map((record, index) => {
        const recordSources = sources.filter((source) => source.record_id === record.id);
        return <li className="ui-card ui-stack-sm" key={record.id}>
          <div className="ui-row"><StatusBadge>{categoryLabels[record.category] ?? "Community history"}</StatusBadge><span className="ui-meta">{record.community ? record.community : null}{record.family_name ? `${record.community ? " · " : ""}${record.family_name} family` : null}</span><span className="ui-number" aria-label={`Record ${index + 1}`}>{String(index + 1).padStart(2, "0")}</span></div>
          <h3 className="ui-item-title">{record.title}</h3>
          <div className="ui-prose"><p className="whitespace-pre-wrap">{record.account}</p></div>
          {record.lineage_description ? <div className="ui-subtle ui-card"><h4 className="ui-item-title">Lineage context</h4><p className="ui-prose whitespace-pre-wrap">{record.lineage_description}</p></div> : null}
          <p className="ui-meta">Published {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(record.published_at))}</p>
          <div className="ui-divider" />
          <div className="ui-stack-sm"><h4 className="ui-item-title">Sources</h4>{recordSources.length ? <ul className="ui-list ui-stack-sm">{recordSources.map((source) => <li className="ui-meta" key={source.id}>{source.source_url ? <a className="ui-text-link" href={source.source_url} rel="noreferrer">{source.citation}</a> : source.citation}</li>)}</ul> : <p className="ui-muted">Source citation is not available for display.</p>}</div>
        </li>;
      })}</ol>
    </section>}

    <section id="contribute" className="ui-stack" aria-labelledby="contribute-heading">
      <SectionHeading eyebrow="Share a history" title="Contribute an account" description="Submissions and evidence are private. Please identify the source and publication rights; never submit another person’s private contact details. Staff review and verification are required before publication." id="contribute-heading" />
      <Notice tone="warning"><strong>Images and video are not currently accepted.</strong> Secure private media storage and staff-controlled publication are unavailable until a storage provider is configured. Do not submit media URLs or upload private files.</Notice>
      {contributionState === "sent" ? <Notice tone="success" role="status">Your account was received privately for review. Submission does not mean it has been approved or published.</Notice> : null}
      {contributionState === "invalid" ? <Notice tone="danger" role="alert">Please check required fields, category, HTTPS source link, rights information and consent.</Notice> : null}
      {contributionState === "error" ? <Notice tone="danger" role="alert">The private submission could not be saved. Confirm your member profile is active and try again later.</Notice> : null}
      <Panel>
        {signedIn ? <form action={submitHistoryContribution} className="ui-stack">
          <div className="ui-field"><label className="label" htmlFor="history-title">Account title</label><input className="input" id="history-title" name="title" required minLength={3} maxLength={180} /></div>
          <div className="ui-field"><label className="label" htmlFor="history-account">Your account</label><textarea className="input" id="history-account" name="account" required minLength={20} maxLength={20000} rows={8} /></div>
          <div className="ui-field"><label className="label" htmlFor="history-category">Category</label><select className="input" id="history-category" name="category" required defaultValue="community-history">{categories.map((item) => <option key={item} value={item}>{categoryLabels[item]}</option>)}</select></div>
          <div className="ui-grid ui-grid--2">
            <div className="ui-field"><label className="label" htmlFor="history-community">Community (optional)</label><input className="input" id="history-community" name="community" maxLength={120} /></div>
            <div className="ui-field"><label className="label" htmlFor="history-family">Family / house name (optional)</label><input className="input" id="history-family" name="family_name" maxLength={180} /></div>
          </div>
          <div className="ui-field"><label className="label" htmlFor="history-lineage">Lineage context (optional)</label><textarea className="input" id="history-lineage" name="lineage_description" maxLength={5000} rows={4} /><p className="ui-muted">Share only information you have permission to submit and that is appropriate for public release after staff review.</p></div>
          <div className="ui-field"><label className="label" htmlFor="history-source">Source or basis for the account</label><textarea className="input" id="history-source" name="source_description" required minLength={5} maxLength={2000} rows={4} /><p className="ui-muted">Identify a document, publication, archive or first-hand account and how it can be checked. Do not include confidential details.</p></div>
          <div className="ui-field"><label className="label" htmlFor="history-url">Public source link (optional)</label><input className="input" id="history-url" name="source_url" type="url" pattern="https://.*" maxLength={1000} placeholder="https://" /></div>
          <div className="ui-field"><label className="label" htmlFor="history-rights">Publication rights / permission basis</label><textarea className="input" id="history-rights" name="rights_description" required minLength={5} maxLength={2000} rows={4} /><p className="ui-muted">Describe your rights or permission to submit for possible publication. Staff must verify this before publishing.</p></div>
          <div className="ui-subtle ui-card"><label className="ui-row"><input className="size-5 shrink-0" type="checkbox" name="consent" value="yes" required /><span>I confirm this account is submitted for community-history review, that I identified its source and rights basis to the best of my knowledge, and that I consent to staff review and possible publication only after verification. I understand submission does not guarantee publication and may request correction or removal.</span></label></div>
          <button className="btn-primary" type="submit">Submit privately for review</button>
        </form> : <div className="ui-stack-sm"><p className="ui-muted">Sign in with an active member profile to submit an account privately for review.</p><Link className="btn-secondary" href="/login?next=%2Fitan-ilu-mi">Sign in to contribute</Link></div>}
      </Panel>
    </section>
  </PageFrame>;
}
