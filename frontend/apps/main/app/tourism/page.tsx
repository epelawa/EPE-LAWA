import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { PageFrame, PageIntro, Panel, SectionHeading, Notice, EmptyPanel } from "../../components/design-system";
import { submitTourismContribution } from "./actions";

export const metadata: Metadata = { title: "Historical Sites & Tourism", description: "Browse approved, source-backed Epe tourism destinations and verified visitor details.", alternates: { canonical: "/tourism" } };
type Destination = { id: string; slug: string; name: string; description: string; visitor_context: string | null; location_label: string | null; published_at: string; source_citation: string; source_url: string | null };

export default async function TourismPage({ searchParams }: { searchParams: Promise<{ q?: string; submission?: string }> }) {
  const params = await searchParams;
  const query = (params.q ?? "").trim().slice(0, 100);
  let records: Destination[] = [];
  let failed = false;
  try {
    const supabase = await createClient();
    let q = supabase.from("tourism_destinations").select("id,slug,name,description,visitor_context,location_label,published_at,source_citation,source_url");
    if (query) q = q.or(`name.ilike.%${query.replace(/[,%()]/g, " ")}%,description.ilike.%${query.replace(/[,%()]/g, " ")}%`);
    const result = await q.order("name").limit(50);
    if (result.error) { failed = true; console.error("tourism public read failed", { code: result.error.code }); }
    else records = (result.data ?? []) as Destination[];
  } catch { failed = true; }
  let signedIn = false;
  try { const supabase = await createClient(); const result = await supabase.auth.getUser(); signedIn = Boolean(result.data.user); } catch {}

  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="Epe Lawa · Public record" title="Historical Sites &amp; Tourism" description="A guide to Epe destinations, built from verified sources. Visitor and location details appear only when checked by our editorial team." />
    <Notice tone="neutral">We do not guess opening hours, prices, access conditions or locations. Confirm current arrangements with the destination before travelling.</Notice>

    <form method="get" role="search" className="ui-toolbar">
      <div className="ui-field"><label className="label" htmlFor="tourism-query">Search approved destinations</label><input className="input" id="tourism-query" name="q" maxLength={100} defaultValue={query} /></div>
      <button className="btn-primary" type="submit">Search</button>
    </form>

    {failed ? <EmptyPanel title="Destinations could not be loaded" description="Please try again later. We are not showing unverified destination information." /> : records.length === 0 ? <EmptyPanel title={query ? "No approved destinations match" : "No approved destinations yet"} description={<>There are currently no published, source-backed tourism records{query ? " matching this search" : ""}. We will add information only after source, visitor detail and publication-rights review.</>} /> : <section className="ui-stack-sm" aria-labelledby="destinations-heading">
      <SectionHeading eyebrow="01 · Approved records" title="Explore destinations" id="destinations-heading" description={<>{records.length} record{records.length === 1 ? "" : "s"}{records.length === 50 ? " · showing first 50" : ""}</>} />
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

    <section className="ui-stack" aria-labelledby="contribute-title">
      <SectionHeading eyebrow="02 · Community contribution" title="Suggest a destination" id="contribute-title" description="Contributions stay private until staff verify the source and publication rights. Do not submit sensitive access details or personal residential addresses. Submission is not approval." />
      {params.submission === "sent" ? <Notice tone="success" role="status">Your suggestion was received privately for editorial review. It is not published.</Notice> : null}
      {params.submission === "invalid" ? <Notice tone="warning" role="alert">Please check the required fields, HTTPS links, media-rights description and consent.</Notice> : null}
      {params.submission === "error" ? <Notice tone="danger" role="alert">The private suggestion could not be saved. Confirm your member profile is active and try again later.</Notice> : null}
      {signedIn ? <Panel><form action={submitTourismContribution} className="ui-stack">
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
        <label className="ui-subtle ui-row"><input type="checkbox" name="consent" value="yes" required /><span>I confirm these details are submitted for private editorial review, the source is identified, and any media rights basis is accurately described. I understand nothing will be published unless provenance and rights are verified.</span></label>
        <div className="ui-actions"><button className="btn-primary" type="submit">Submit privately for review</button></div>
      </form></Panel> : <p><Link className="btn-secondary" href="/login?next=%2Ftourism">Sign in to suggest a destination</Link></p>}
    </section>
    <p className="ui-meta">Directions are an external Google Maps handoff, not a live EPE LAWA location service. Verify the destination and route before travel.</p>
  </PageFrame>;
}
