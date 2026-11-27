import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { PageFrame, PageIntro, Panel, SectionHeading, EmptyPanel, Notice, StatusBadge } from "../../components/design-system";
import ContributeForm from "./contribute-form";
import { publicMediaUrl } from "../../lib/media";
import { FilterIcon, SearchIcon } from "../../components/icons";
import { buildOrIlikeContains } from "../../lib/postgrest-search";

export const metadata: Metadata = {
  title: "Itan Ilu Mi",
  description: "Read approved, source-backed community history and contribute an account for private review.",
  alternates: { canonical: "/itan-ilu-mi" },
};

type RecordRow = { id: string; title: string; account: string; published_at: string; community: string | null; category: string; family_name: string | null; lineage_description: string | null; image_key: string | null; image_alt: string | null };
type SourceRow = { id: string; record_id: string; citation: string; source_url: string | null };
const categories = ["community-history", "family-lineage", "cultural-practice", "place-history", "oral-history", "other"] as const;
const categoryLabels: Record<string, string> = { "community-history": "Community history", "family-lineage": "Family / house lineage", "cultural-practice": "Cultural practice", "place-history": "Place history", "oral-history": "Oral history", other: "Other" };

const PAGE_SIZE = 10;

export default async function ItanIluMiPage({ searchParams }: { searchParams: Promise<{ contribution?: string; q?: string; category?: string; page?: string }> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 120) : "";
  const category = categories.includes(params.category as typeof categories[number]) ? params.category : "";
  const page = typeof params.page === "string" && /^\d{1,4}$/.test(params.page) ? Math.min(Math.max(Number(params.page), 1), 1000) : 1;
  const offset = (page - 1) * PAGE_SIZE;
  function pageHref(next: number) {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    if (category) search.set("category", category);
    if (next > 1) search.set("page", String(next));
    const suffix = search.toString();
    return suffix ? `/itan-ilu-mi?${suffix}#archive` : "/itan-ilu-mi#archive";
  }
  let hasNext = false;
  let records: RecordRow[] = [];
  let sources: SourceRow[] = [];
  let failed = false;
  let signedIn = false;
  let accountEmail: string | null = null;
  try {
    const supabase = await createClient();
    let recordQuery = supabase.from("history_records").select("id,title,account,published_at,community,category,family_name,lineage_description,image_key,image_alt");
    const safeQuery = query.replace(/[^\p{L}\p{N} '-]/gu, " ").trim();
    if (safeQuery) recordQuery = recordQuery.or(buildOrIlikeContains(["family_name", "community"], safeQuery));
    if (category) recordQuery = recordQuery.eq("category", category);
    const [recordsResult, authResult] = await Promise.all([
      recordQuery.order("published_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + PAGE_SIZE),
      supabase.auth.getUser(),
    ]);
    signedIn = Boolean(authResult.data.user);
    accountEmail = authResult.data.user?.email ?? null;
    if (recordsResult.error) {
      console.error("history public read failed", { code: recordsResult.error.code });
      failed = true;
    } else {
      const results = (recordsResult.data ?? []) as RecordRow[];
      hasNext = results.length > PAGE_SIZE;
      records = results.slice(0, PAGE_SIZE);
      if (records.length) {
        const sourceResult = await supabase.from("history_record_sources").select("id,record_id,citation,source_url").in("record_id", records.map((record) => record.id)).limit(200);
        if (sourceResult.error) { console.error("history source read failed", { code: sourceResult.error.code }); failed = true; }
        else sources = (sourceResult.data ?? []) as SourceRow[];
      }
    }
  } catch { failed = true; }

  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="Community record" title="Ìtàn Ilú Mi" description="A community archive built from identifiable sources and reviewed contributions. Accounts are not published until evidence, consent and publication rights have been checked." meta={<span>Verified accounts · Private submissions</span>} />

    <form method="get" className="ui-toolbar filter-panel filter-panel--compact" role="search" aria-label="Search published records">
      <div className="filter-panel__heading"><span className="filter-panel__icon" aria-hidden="true"><FilterIcon/></span><div><h2 className="filter-panel__title">Search the archive</h2></div></div>
      <div className="ui-field ui-field--wide"><label className="label sr-only" htmlFor="history-search">Family name or community</label><div className="filter-panel__control"><SearchIcon className="filter-panel__input-icon"/><input className="input" id="history-search" name="q" maxLength={120} defaultValue={query} placeholder="Family name or community" autoComplete="off" /></div></div>
      <div className="ui-field"><label className="label sr-only" htmlFor="history-filter">Category</label><select className="input" id="history-filter" name="category" defaultValue={category}><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{categoryLabels[item]}</option>)}</select></div>
      <div className="ui-actions"><button className="btn-primary" type="submit"><SearchIcon size={16}/>Search<span className="sr-only"> published records</span></button>{query || category ? <Link className="btn-secondary" href="/itan-ilu-mi">Clear</Link> : null}</div>
    </form>

    <div id="archive" />
    {failed ? <EmptyPanel title="History records could not be loaded" description="Please try again later. No archive content is shown while records or source notes cannot be verified." /> : records.length === 0 ? <EmptyPanel title={page > 1 ? "No records on this page" : query || category ? "No published records match" : "No approved history records yet"} description="There are currently no published, source-backed accounts matching this search. We do not fill this space with unverified or invented history." /> : <section className="ui-stack" aria-labelledby="archive-heading">
      <SectionHeading eyebrow="The archive" title="Published accounts" description="Source-backed histories approved for public reading." id="archive-heading" />
      <ol className="ui-list ui-stack-sm">{records.map((record, index) => {
        const recordSources = sources.filter((source) => source.record_id === record.id);
        return <li className="ui-card ui-stack-sm" key={record.id}>
          <div className="ui-row"><StatusBadge>{categoryLabels[record.category] ?? "Community history"}</StatusBadge><span className="ui-meta">{record.community ? record.community : null}{record.family_name ? `${record.community ? " · " : ""}${record.family_name} family` : null}</span><span className="ui-number" aria-label={`Record ${offset + index + 1}`}>{String(offset + index + 1).padStart(2, "0")}</span></div>
          <h3 className="ui-item-title">{record.title}</h3>
          {publicMediaUrl(record.image_key) ? <figure className="ui-stack-sm" style={{ margin: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={publicMediaUrl(record.image_key) ?? undefined} alt={record.image_alt ?? ""} loading="lazy" decoding="async" style={{ width: "100%", maxHeight: 420, objectFit: "contain", borderRadius: 12, border: "1px solid #293650", background: "#0A1023" }} />
            {record.image_alt ? <figcaption className="ui-meta">{record.image_alt}</figcaption> : null}
          </figure> : null}
          <div className="ui-prose"><p className="whitespace-pre-wrap">{record.account}</p></div>
          {record.lineage_description ? <div className="ui-subtle ui-card"><h4 className="ui-item-title">Lineage context</h4><p className="ui-prose whitespace-pre-wrap">{record.lineage_description}</p></div> : null}
          <p className="ui-meta">Published {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(record.published_at))}</p>
          <p><Link className="btn-secondary" href={`/itan-ilu-mi/correction?record=${encodeURIComponent(record.title)}`}>Request a correction</Link></p>
          <div className="ui-divider" />
          <div className="ui-stack-sm"><h4 className="ui-item-title">Sources</h4>{recordSources.length ? <ul className="ui-list ui-stack-sm">{recordSources.map((source) => <li className="ui-meta" key={source.id}>{source.source_url ? <a className="ui-text-link" href={source.source_url} rel="noreferrer">{source.citation}</a> : source.citation}</li>)}</ul> : <p className="ui-muted">Source citation is not available for display.</p>}</div>
        </li>;
      })}</ol>
    </section>}

    {!failed && (page > 1 || hasNext) ? <nav className="ui-actions" aria-label="History pagination">
      {page > 1 ? <Link className="btn-secondary" href={pageHref(page - 1)}>Previous page</Link> : null}
      <span className="ui-meta">Page {page}</span>
      {hasNext && page < 1000 ? <Link className="btn-secondary" href={pageHref(page + 1)}>Next page</Link> : null}
    </nav> : null}

    <section id="contribute" className="ui-stack" aria-labelledby="contribute-heading">
      <SectionHeading eyebrow="Share a history" title="Contribute an account" description="Anyone can contribute — signing in is optional. Submissions, photos and evidence stay private until staff review and verify them. Please identify the source and publication rights, and never submit another person’s private contact details." id="contribute-heading" />
      <Notice tone="neutral">You can attach one photograph (a document, place, object or family picture). Video is not accepted. Photos are reviewed privately and published only if staff approve them with the record.</Notice>
      <Panel>
        <ContributeForm signedIn={signedIn} accountEmail={accountEmail} />
      </Panel>
    </section>
  </PageFrame>;
}
