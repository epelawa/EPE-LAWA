import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { pageMetadata } from "../../../lib/metadata";
import { PageFrame, PageIntro, Panel, SectionHeading, Notice } from "../../../components/design-system";

const mapsUrl = (query: string) => { const url = new URL("https://www.google.com/maps/search/"); url.searchParams.set("api", "1"); url.searchParams.set("query", query); return url.toString(); };
type Destination = { id: string; slug: string; name: string; description: string; visitor_context: string | null; visit_details: string | null; location_label: string | null; directions_query: string | null; opening_hours: string | null; price_details: string | null; access_details: string | null; source_citation: string; source_url: string | null; media_url: string | null; published_at: string };
type RelatedDestination = { slug: string; name: string; location_label: string | null };
async function destination(slug: string): Promise<Destination | null> { const supabase = await createClient(); const result = await supabase.from("tourism_destinations").select("id,slug,name,description,visitor_context,visit_details,location_label,directions_query,opening_hours,price_details,access_details,source_citation,source_url,media_url,published_at").eq("slug", slug).maybeSingle(); if (result.error) { console.error("tourism detail read failed", { code: result.error.code }); throw new Error("tourism unavailable"); } return result.data as Destination | null; }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const item = await destination((await params).slug);
    if (!item) return { title: "Destination not found", robots: { index: false, follow: false } };
    const description = item.description.replace(/\s+/g, " ").trim().slice(0, 155).trimEnd();
    const path = `/tourism/${encodeURIComponent(item.slug)}` as `/${string}`;
    const base = pageMetadata({ title: item.name, description, path });
    if (!item.media_url) return base;
    return {
      ...base,
      openGraph: { ...base.openGraph, images: [{ url: item.media_url, alt: `Approved image of ${item.name}` }] },
      twitter: { ...base.twitter, images: [item.media_url] },
    };
  } catch {
    return { title: "Destination unavailable", robots: { index: false, follow: false } };
  }
}

export default async function TourismDetail({ params }: { params: Promise<{ slug: string }> }) {
  let item: Destination | null;
  try { item = await destination((await params).slug); }
  catch { return <PageFrame><Panel role="alert" className="ui-stack-sm"><h1>Destination could not be loaded</h1><p className="ui-muted">Please try again later. Unverified information is not shown.</p><Link className="ui-text-link" href="/tourism">Return to Tourism</Link></Panel></PageFrame>; }
  if (!item) notFound();
  const direction = item.directions_query || item.location_label;
  let related: RelatedDestination[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("tourism_destinations").select("slug,name,location_label")
      .neq("id", item.id)
      .order("name", { ascending: true }).limit(3);
    related = (data ?? []) as RelatedDestination[];
  } catch { related = []; }
  return <PageFrame className="ui-stack">
    <nav aria-label="Breadcrumb" className="ui-meta"><Link className="ui-back-link" href="/tourism">Historical Sites &amp; Tourism</Link><span aria-hidden="true">/</span><span aria-current="page">{item.name}</span></nav>
    <article className="ui-stack">
      <PageIntro title={item.name} description={item.location_label ?? undefined} />
      {item.media_url ? <figure className="ui-cover"><img src={item.media_url} alt={`Approved image of ${item.name}`} loading="lazy" /><figcaption className="ui-meta">Media used under documented rights clearance.</figcaption></figure> : null}
      <div className="ui-split">
        <div className="ui-stack">
          <section className="ui-prose"><SectionHeading title="About this destination" /><p className="whitespace-pre-wrap">{item.description}</p></section>
          {item.visitor_context ? <section className="ui-prose"><SectionHeading title="Visitor context" /><p className="whitespace-pre-wrap">{item.visitor_context}</p></section> : null}
          {item.visit_details ? <section className="ui-prose"><SectionHeading title="Visit information" /><p className="whitespace-pre-wrap">{item.visit_details}</p></section> : null}
          <Panel className="ui-stack-sm"><SectionHeading title="Sources" /><p>{item.source_url ? <a href={item.source_url} rel="noreferrer">{item.source_citation}</a> : item.source_citation}</p><p className="ui-meta">Published {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(item.published_at))}</p></Panel>
        </div>
        <aside className="ui-sidebar"><Panel className="ui-stack-sm"><SectionHeading title="Plan a visit" /><dl className="ui-list ui-stack-sm">{[["Opening hours", item.opening_hours], ["Prices", item.price_details], ["Access", item.access_details]].map(([label, value]) => <div className="ui-item" key={label}><dt className="ui-item-title">{label}</dt><dd className="ui-muted">{value || "Not verified / not provided"}</dd></div>)}</dl>{direction ? <a className="btn-primary" target="_blank" rel="noopener noreferrer" href={mapsUrl(direction)}>Search in Google Maps <span className="sr-only">(opens in a new tab)</span></a> : <Notice tone="neutral">A destination location has not been verified, so no map handoff is available.</Notice>}<p className="ui-meta">External map link only. Confirm location and current arrangements before travel.</p></Panel></aside>
      </div>
    </article>
    {related.length ? <section className="ui-stack-sm" aria-labelledby="related-destinations">
      <SectionHeading title="More destinations" id="related-destinations" />
      <ul className="ui-list">
        {related.map((relatedItem) => <li className="ui-item" key={relatedItem.slug}>
          <h3 className="ui-item-title"><Link href={`/tourism/${encodeURIComponent(relatedItem.slug)}`}>{relatedItem.name}</Link></h3>
          {relatedItem.location_label ? <p className="ui-muted">{relatedItem.location_label}</p> : null}
        </li>)}
      </ul>
    </section> : null}
    <Link className="ui-back-link" href="/tourism">All destinations</Link>
  </PageFrame>;
}
