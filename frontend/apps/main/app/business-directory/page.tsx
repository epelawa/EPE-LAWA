import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "../../lib/supabase";

export const metadata: Metadata = { title: "Business directory", description: "Browse published business listings.", alternates: { canonical: "/business-directory" } };
type Search = { q?: string | string[]; area?: string | string[]; category?: string | string[] };
type Category = { slug: string; label: string };
type Business = { sponsored?: boolean; id: string; slug: string; name: string; category_label: string; description: string | null; area: string | null; address: string | null; phone: string | null; whatsapp: string | null; website: string | null; is_verified: boolean };
const one = (value: string | string[] | undefined) => typeof value === "string" ? value.trim().slice(0, 100) : "";
const escapedLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");

export default async function BusinessDirectoryPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const q = one(params.q);
  const area = one(params.area);
  const category = one(params.category);
  let businesses: Business[] = [];
  let categories: Category[] = [];
  let failed = false;
  try {
    const supabase = await createClient();
    const [directoryResult, categoryResult] = await Promise.all([
      (() => {
        let query = supabase.from("published_businesses").select("id,slug,name,category_label,description,area,address,phone,whatsapp,website,is_verified").order("name").limit(100);
        if (q) query = query.ilike("name", `%${escapedLike(q)}%`);
        if (area) query = query.ilike("area", `%${escapedLike(area)}%`);
        if (category) query = query.eq("category_slug", category);
        return query;
      })(),
      supabase.from("business_categories").select("slug,label").eq("is_active", true).order("sort_order").limit(100),
    ]);
    if (directoryResult.error || categoryResult.error) {
      console.error("public business directory read failed", { code: directoryResult.error?.code ?? categoryResult.error?.code });
      failed = true;
    } else {
      businesses = (directoryResult.data ?? []) as Business[];
      const activeAds = await supabase.from("active_business_sponsorships").select("business_id").limit(100);
      if (activeAds.error) { failed = true; businesses = []; } else { const ids = new Set((activeAds.data ?? []).map((x: {business_id:string}) => x.business_id)); businesses = businesses.map(b => ({ ...b, sponsored: ids.has(b.id) })); }
      categories = (categoryResult.data ?? []) as Category[];
    }
  } catch {
    failed = true;
  }

  return <div className="ep-container py-12">
    <header className="mb-8"><p className="page-header__eyebrow">Discover</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Business directory</h1><p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">Listings shown here come from businesses approved for publication. A verification label appears only when a current verification record exists.</p></header><p className="mb-6"><Link className="inline-flex min-h-11 items-center rounded border px-4 py-2 font-semibold underline" href="/business-directory/submit">Submit a business</Link></p>
    <form action="/business-directory" method="get" className="card mb-8 grid gap-4 p-5 sm:grid-cols-3"><div><label htmlFor="directory-q" className="mb-1 block text-sm font-semibold">Business name</label><input id="directory-q" name="q" defaultValue={q} maxLength={100} className="w-full rounded border border-[var(--color-border-strong)] bg-white px-3 py-2" /></div><div><label htmlFor="directory-area" className="mb-1 block text-sm font-semibold">Area (as listed)</label><input id="directory-area" name="area" defaultValue={area} maxLength={100} className="w-full rounded border border-[var(--color-border-strong)] bg-white px-3 py-2" /></div><div><label htmlFor="directory-category" className="mb-1 block text-sm font-semibold">Category</label><select id="directory-category" name="category" defaultValue={category} className="w-full rounded border border-[var(--color-border-strong)] bg-white px-3 py-2"><option value="">All categories</option>{categories.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}</select></div><div className="flex items-end gap-3"><button className="min-h-11 rounded bg-primary px-4 py-2 font-semibold text-white focus-visible:outline focus-visible:outline-2" type="submit">Search listings</button><Link className="px-2 py-3 underline" href="/business-directory">Clear filters</Link></div></form>
    {failed ? <section className="card p-6" role="status"><h2 className="text-lg font-bold">The directory could not be loaded</h2><p className="mt-2 text-muted-foreground">Please try again later. No listing data is shown.</p></section> : businesses.length === 0 ? <section className="card p-8"><h2 className="text-lg font-bold">No published businesses match this search</h2><p className="mt-2 text-muted-foreground">Try changing the search, or check back after a business has been approved for publication.</p></section> : <><p className="mb-4 text-sm text-muted-foreground">{businesses.length} {businesses.length === 1 ? "published listing" : "published listings"}{businesses.length === 100 ? " (showing up to 100)" : ""}</p><ul className="grid gap-4 md:grid-cols-2">{businesses.map((business) => <li key={business.slug} className="card p-5">{business.sponsored ? <p className="mb-1 inline-block rounded-full border px-3 py-1 text-xs font-bold">Sponsored</p> : null}<p className="text-sm font-semibold text-primary">{business.category_label}</p><h2 className="mt-1 text-xl font-bold"><Link href={`/business-directory/${encodeURIComponent(business.slug)}`} className="underline decoration-transparent hover:decoration-current focus-visible:outline focus-visible:outline-2">{business.name}</Link></h2>{business.is_verified ? <p className="mt-2 text-sm font-semibold">Verified</p> : null}{business.description ? <p className="mt-3 leading-relaxed text-muted-foreground">{business.description}</p> : null}<dl className="mt-4 space-y-1 text-sm">{business.area ? <div><dt className="inline font-semibold">Area: </dt><dd className="inline">{business.area}</dd></div> : null}{business.address ? <div><dt className="inline font-semibold">Address: </dt><dd className="inline">{business.address}</dd></div> : null}{business.phone ? <div><dt className="inline font-semibold">Phone: </dt><dd className="inline"><a className="underline" href={`tel:${business.phone}`}>{business.phone}</a></dd></div> : null}{business.website ? <div><dt className="inline font-semibold">Website: </dt><dd className="inline"><a className="underline" href={business.website} rel="noreferrer">Visit website</a></dd></div> : null}</dl><Link className="mt-4 inline-block min-h-11 rounded border px-4 py-2 font-semibold underline" href={`/business-directory/${encodeURIComponent(business.slug)}`}>View business profile</Link></li>)}</ul></>}
  </div>;
}
