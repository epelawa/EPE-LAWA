import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { EmptyPanel, PageFrame, PageIntro, Panel, StatusBadge } from "../../components/design-system";

export const metadata: Metadata = { title: "Business directory", description: "Browse published business listings.", alternates: { canonical: "/business-directory" } };
type Search = { q?: string | string[]; area?: string | string[]; category?: string | string[] };
type Category = { slug: string; label: string };
type Business = { sponsored?: boolean; id: string; slug: string; name: string; category_label: string; description: string | null; area: string | null; address: string | null; phone: string | null; whatsapp: string | null; website: string | null; is_verified: boolean };
const one = (value: string | string[] | undefined) => typeof value === "string" ? value.trim().slice(0, 100) : "";
const escapedLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");

export default async function BusinessDirectoryPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const q = one(params.q), area = one(params.area), category = one(params.category);
  let businesses: Business[] = [], categories: Category[] = [], failed = false;
  try {
    const supabase = await createClient();
    const [directoryResult, categoryResult] = await Promise.all([
      (() => { let query = supabase.from("published_businesses").select("id,slug,name,category_label,description,area,address,phone,whatsapp,website,is_verified").order("name").limit(100); if (q) query = query.ilike("name", `%${escapedLike(q)}%`); if (area) query = query.ilike("area", `%${escapedLike(area)}%`); if (category) query = query.eq("category_slug", category); return query; })(),
      supabase.from("business_categories").select("slug,label").eq("is_active", true).order("sort_order").limit(100),
    ]);
    if (directoryResult.error || categoryResult.error) { console.error("public business directory read failed", { code: directoryResult.error?.code ?? categoryResult.error?.code }); failed = true; }
    else {
      businesses = (directoryResult.data ?? []) as Business[];
      const activeAds = await supabase.from("active_business_sponsorships").select("business_id").limit(100);
      if (activeAds.error) { failed = true; businesses = []; } else { const ids = new Set((activeAds.data ?? []).map((x: { business_id: string }) => x.business_id)); businesses = businesses.map(b => ({ ...b, sponsored: ids.has(b.id) })); }
      categories = (categoryResult.data ?? []) as Category[];
    }
  } catch { failed = true; }

  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="Discover · Marketplace" title="Business directory" description="Explore businesses approved for publication. Verification appears only when a current verification record exists." actions={<Link className="btn-primary" href="/business-directory/submit">Submit a business</Link>} />
    <form action="/business-directory" method="get" className="ui-toolbar ui-form-grid">
      <div className="ui-field"><label className="label" htmlFor="directory-q">Business name</label><input id="directory-q" name="q" defaultValue={q} maxLength={100} className="input" /></div>
      <div className="ui-field"><label className="label" htmlFor="directory-area">Area (as listed)</label><input id="directory-area" name="area" defaultValue={area} maxLength={100} className="input" /></div>
      <div className="ui-field"><label className="label" htmlFor="directory-category">Category</label><select id="directory-category" name="category" defaultValue={category} className="input"><option value="">All categories</option>{categories.map(item => <option key={item.slug} value={item.slug}>{item.label}</option>)}</select></div>
      <div className="ui-actions"><button className="btn-primary" type="submit">Search listings</button><Link className="btn-secondary" href="/business-directory">Clear filters</Link></div>
    </form>
    {failed ? <EmptyPanel title="The directory could not be loaded" description="Please try again later. No listing data is shown." /> : businesses.length === 0 ? <EmptyPanel title="No published businesses match this search" description="Try changing the search, or check back after a business has been approved for publication." /> : <section className="ui-stack-sm" aria-label="Directory results"><p className="ui-meta">{businesses.length} {businesses.length === 1 ? "published listing" : "published listings"}{businesses.length === 100 ? " · showing up to 100" : ""}</p><ul className="ui-grid ui-grid--2 ui-list">{businesses.map(business => <li key={business.slug}><Panel className="ui-card ui-stack-sm">{business.sponsored ? <StatusBadge>Sponsored</StatusBadge> : null}<p className="ui-eyebrow">{business.category_label}</p><h2 className="ui-item-title"><Link href={`/business-directory/${encodeURIComponent(business.slug)}`}>{business.name}</Link></h2>{business.is_verified ? <StatusBadge tone="success">Verified</StatusBadge> : null}{business.description ? <p className="ui-muted">{business.description}</p> : null}<dl className="ui-list ui-meta">{business.area ? <div><dt>Area</dt><dd>{business.area}</dd></div> : null}{business.address ? <div><dt>Address</dt><dd>{business.address}</dd></div> : null}{business.phone ? <div><dt>Phone</dt><dd><a href={`tel:${business.phone}`}>{business.phone}</a></dd></div> : null}{business.website ? <div><dt>Website</dt><dd><a href={business.website} rel="noreferrer">Visit website</a></dd></div> : null}</dl><Link className="btn-secondary" href={`/business-directory/${encodeURIComponent(business.slug)}`}>View business profile</Link></Panel></li>)}</ul></section>}
  </PageFrame>;
}
