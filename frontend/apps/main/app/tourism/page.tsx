import HumanCheck from "../../components/human-check";
import { SubmitButton } from "@epelawa/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { FilterIcon, SearchIcon } from "../../components/icons";
import { createClient } from "../../lib/supabase";
import { PageFrame, PageIntro, Panel, SectionHeading, Notice, EmptyPanel } from "../../components/design-system";
import { submitTourismContribution } from "./actions";
import GuestContactFields from "../../components/guest-contact-fields";
import Image from "next/image";
import { buildOrIlikeContains } from "../../lib/postgrest-search";
import styles from "./tourism.module.css";

export const metadata: Metadata = { title: "Historical Sites & Tourism", description: "Browse approved, source-backed Epe tourism destinations and verified visitor details.", alternates: { canonical: "/tourism" } };
type Destination = { id: string; slug: string; name: string; description: string; visitor_context: string | null; location_label: string | null; published_at: string; source_citation: string; source_url: string | null };
type SearchParams = { q?: string | string[]; page?: string | string[]; submission?: string | string[] };
const PAGE_SIZE = 50;
const MAX_PAGE = 1000;
function first(value: string | string[] | undefined): string { return typeof value === "string" ? value : ""; }
function cleanSearch(value: string | string[] | undefined): string { return first(value).trim().slice(0, 100).replace(/[^\p{L}\p{N} '\u2019-]/gu, " ").replace(/\s+/g, " ").trim(); }
function safePage(value: string | string[] | undefined): number {
  const raw = first(value);
  if (!/^\d{1,6}$/.test(raw)) return 1;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, MAX_PAGE) : 1;
}
function pageHref(page: number, query: string): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `/tourism?${suffix}` : "/tourism";
}

export default async function TourismPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const query = cleanSearch(params.q);
  const page = safePage(params.page);
  const submission = first(params.submission);
  const start = (page - 1) * PAGE_SIZE;
  let records: Destination[] = [];
  let hasOlder = false;
  let failed = false;
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  try {
    supabase = await createClient();
    let request = supabase.from("tourism_destinations").select("id,slug,name,description,visitor_context,location_label,published_at,source_citation,source_url");
    if (query) request = request.or(buildOrIlikeContains(["name", "description"], query));
    const result = await request.order("name", { ascending: true }).order("id", { ascending: true }).range(start, start + PAGE_SIZE);
    if (result.error) { failed = true; console.error("tourism public read failed", { code: result.error.code }); }
    else {
      const rows = (result.data ?? []) as Destination[];
      hasOlder = rows.length > PAGE_SIZE && page < MAX_PAGE;
      records = rows.slice(0, PAGE_SIZE);
    }
  } catch (error) {
    failed = true;
    console.error("tourism public read failed", { reason: error instanceof Error ? error.name : "unknown" });
  }
  let signedIn = false;
  let accountEmail: string | null = null;
  if (supabase) { try { const result = await supabase.auth.getUser(); signedIn = Boolean(result.data.user); accountEmail = result.data.user?.email ?? null; } catch {} }

  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="Epe Lawa · Public record" title="Historical Sites &amp; Tourism" description="A guide to Epe destinations, built from verified sources. Visitor and location details appear only when checked by our editorial team." />
    <Notice tone="neutral">We do not guess opening hours, prices, access conditions or locations. Confirm current arrangements with the destination before travelling.</Notice>

    <section className="ui-stack-sm" aria-labelledby="tourism-photo-references">
      <SectionHeading eyebrow="Photo references" title="Epe in photographs" id="tourism-photo-references" description="Reference photographs of Epe. These are not approved destination listings." />
      <ul className="ui-grid ui-grid--2 ui-list" aria-label="Epe photo references">
        <li className="ui-card ui-stack-sm">
          <figure className={styles.figure}>
            <Image className={styles.photo} src="/epe-iberekodo-beach.jpg" alt="A sandy shoreline with water, sky and green plants in the foreground." width={2592} height={1456} sizes="(max-width: 640px) 100vw, 50vw" />
            <figcaption className={styles.caption}><a href="https://commons.wikimedia.org/wiki/File:Iberekodo_Beach,_Epe,_Lagos.jpg" rel="noreferrer">Iberekodo Beach, Epe, Lagos</a> · Photograph by Tarikhaldun · <a href="https://creativecommons.org/licenses/by-sa/4.0/" rel="license noreferrer">CC BY-SA 4.0</a> · <Link href="/photo-credits">Photo credits</Link></figcaption>
          </figure>
        </li>
        <li className="ui-card ui-stack-sm">
          <figure className={styles.figure}>
            <Image className={styles.photo} src="/epe-through-mangrove.jpg" alt="People in canoes on a tree-lined waterway, seen from another canoe." width={1600} height={1200} sizes="(max-width: 640px) 100vw, 50vw" />
            <figcaption className={styles.caption}><a href="https://commons.wikimedia.org/wiki/File:Through_Epe_Mangrove.jpg" rel="noreferrer">Through Epe Mangrove</a> · Photograph by Dotun55 (Adedotun Ajibade) · <a href="https://creativecommons.org/licenses/by-sa/4.0/" rel="license noreferrer">CC BY-SA 4.0</a> · <Link href="/photo-credits">Photo credits</Link></figcaption>
          </figure>
        </li>
      </ul>
    </section>

    <form method="get" action="/tourism" role="search" aria-label="Search approved tourism destinations" className="ui-toolbar filter-panel">
      <div className="filter-panel__heading"><span className="filter-panel__icon"><FilterIcon/></span><div><p className="ui-eyebrow">Approved records</p><h2 className="filter-panel__title">Find a destination</h2></div></div>
      <div className="ui-field"><label className="label" htmlFor="tourism-query">Search approved destinations</label><div className="filter-panel__control"><SearchIcon className="filter-panel__input-icon"/><input className="input" id="tourism-query" name="q" maxLength={100} defaultValue={query} placeholder="Name or description" data-slash-focus /></div></div>
      <button className="btn-primary" type="submit"><SearchIcon size={16}/>Search</button>
    </form>

    {failed ? <EmptyPanel title="Destinations could not be loaded" description="Please try again later. We are not showing unverified destination information." actions={<Link href={pageHref(page, query)} className="btn-secondary">Reload destinations</Link>} /> : records.length === 0 ? <EmptyPanel title={query ? "No approved destinations match" : page > 1 ? "No destinations on this page" : "No approved destinations yet"} description={query ? "There are no published, source-backed destinations matching this search. Try another term or clear the search." : page > 1 ? "There are no older approved destinations on this page." : "There are currently no published, source-backed tourism records. We will add information only after source, visitor detail and publication-rights review."} actions={query ? <Link href="/tourism" className="btn-secondary">Clear search</Link> : undefined} /> : <section className="ui-stack-sm" aria-labelledby="destinations-heading">
      <SectionHeading eyebrow="01 · Approved records" title="Explore destinations" id="destinations-heading" description={<>{records.length} record{records.length === 1 ? "" : "s"} on page {page}</>} />
      <ul className="ui-grid ui-grid--2 ui-list">
        {records.map((item) => <li key={item.id} className="ui-card ui-stack-sm">
          <p className="ui-meta">{item.location_label ?? "Location details not verified"}</p>
          <h3 className="ui-item-title"><Link href={`/tourism/${encodeURIComponent(item.slug)}`}>{item.name}</Link></h3>
          <p className="ui-muted">{item.description}</p>
          {item.visitor_context ? <p>{item.visitor_context}</p> : null}
          <p className="ui-meta">Source: {item.source_url ? <a href={item.source_url} rel="noreferrer">{item.source_citation}</a> : item.source_citation}</p>
          <Link className="ui-text-link" href={`/tourism/${encodeURIComponent(item.slug)}`}>Destination details</Link>
        </li>)}
      </ul>
    </section>}
    {page > 1 || hasOlder ? <nav className="ui-actions" aria-label="Tourism pages">{page > 1 ? <Link className="btn-secondary" href={pageHref(page - 1, query)}>Newer destinations</Link> : null}<span className="ui-meta" aria-live="polite">Page {page}</span>{hasOlder ? <Link className="btn-secondary" href={pageHref(page + 1, query)}>Older destinations</Link> : null}</nav> : null}

    <section className="ui-stack" aria-labelledby="contribute-title">
      <SectionHeading eyebrow="02 · Community contribution" title="Suggest a destination" id="contribute-title" description="Anyone can suggest a place — signing in is optional. Contributions stay private until staff verify the source and publication rights. Do not submit sensitive access details or personal residential addresses. Submission is not approval." />
      {submission === "sent" ? <Notice tone="success" role="status">Your suggestion was received privately for editorial review. It is not published.</Notice> : null}
      {submission === "invalid" ? <Notice tone="warning" role="alert">Please check the required fields, HTTPS links, media-rights description and consent.</Notice> : null}
      {submission === "limited" ? <Notice tone="warning" role="alert">Too many suggestions from this network this hour. Please wait a while and try again.</Notice> : null}
      {submission === "verify" ? <Notice tone="warning" role="alert">The human check did not finish. Wait for “Verified” under the form, then send again — nothing was saved.</Notice> : null}
      {submission === "verify" ? <Notice tone="warning" role="alert">The human check did not finish. Wait for “Verified” under the form, then send again — nothing was saved.</Notice> : null}
      {submission === "contact" ? <Notice tone="warning" role="alert">Add your name and a valid email address so our team can reply, then send the suggestion again.</Notice> : null}
      {submission === "error" ? <Notice tone="danger" role="alert">The private suggestion could not be saved. Please try again in a moment.</Notice> : null}
      <Panel><details className="ui-disclosure"><summary className="btn-primary">Suggest a destination</summary><form action={submitTourismContribution} className="ui-stack">
        <div className="ui-form-grid">
          <div className="ui-field"><label className="label" htmlFor="tourism-name">Destination name</label><input className="input" id="tourism-name" name="name" required minLength={2} maxLength={180} /></div>
          <div className="ui-field"><label className="label" htmlFor="tourism-source">Source citation</label><textarea className="input" id="tourism-source" name="source_citation" required minLength={5} maxLength={2000} /></div>
          <div className="ui-field"><label className="label" htmlFor="tourism-description">Description and historical context</label><textarea className="input" id="tourism-description" name="description" required minLength={20} maxLength={12000} /></div>
          <div className="ui-field"><label className="label" htmlFor="tourism-visitor">Visitor context (optional)</label><textarea className="input" id="tourism-visitor" name="visitor_context" maxLength={3000} /></div>
          <div className="ui-field"><label className="label" htmlFor="tourism-visit">Visit details, if documented (optional)</label><textarea className="input" id="tourism-visit" name="visit_details" maxLength={3000} /><p className="ui-meta">Staff will separately verify hours, access, prices and location before publishing any such details.</p></div>
          <div className="ui-field"><label className="label" htmlFor="tourism-source-url">Source URL (optional, HTTPS)</label><input className="input" id="tourism-source-url" name="source_url" type="url" pattern="https://.*" maxLength={1000} /></div>
          <div className="ui-field"><label className="label" htmlFor="tourism-media">Media URL (optional, HTTPS)</label><input className="input" id="tourism-media" name="media_url" type="url" pattern="https://.*" maxLength={1000} /></div>
          <div className="ui-field"><label className="label" htmlFor="tourism-rights">Media rights / permission basis (required if media supplied)</label><textarea className="input" id="tourism-rights" name="media_rights" maxLength={2000} /></div>
        </div>
        <GuestContactFields signedIn={signedIn} accountEmail={accountEmail} idPrefix="tourism" />
        <HumanCheck />
        <div hidden aria-hidden="true"><label>Leave this field empty<input name="website" autoComplete="off" tabIndex={-1} /></label></div>
        <label className="ui-subtle ui-row"><input type="checkbox" name="consent" value="yes" required /><span>I confirm these details are submitted for private editorial review, the source is identified, and any media rights basis is accurately described. I understand nothing will be published unless provenance and rights are verified.</span></label>
        <div className="ui-actions"><SubmitButton pendingLabel="Submitting…" className="btn-primary" useLegacyClasses>Submit privately for review</SubmitButton></div>
      </form></details></Panel>
    </section>
    <p className="ui-meta">Directions open in Google Maps. Verify the route before travel.</p>
  </PageFrame>;
}
