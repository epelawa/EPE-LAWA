import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { FilterIcon, SearchIcon } from "../../components/icons";
import { EmptyPanel, Notice, PageFrame, PageIntro, Panel, StatusBadge } from "../../components/design-system";

export const metadata: Metadata = { title: "Business directory", description: "Browse published business listings.", alternates: { canonical: "/business-directory" } };
type Search = { q?: string | string[]; area?: string | string[]; category?: string | string[]; order?: string | string[]; review?: string | string[]; business_error?: string | string[] };
type Category = { slug: string; label: string };
type Business = { sponsored?: boolean; id: string; slug: string; name: string; category_label: string; description: string | null; area: string | null; address: string | null; phone: string | null; whatsapp: string | null; website: string | null; is_verified: boolean };
const one = (value: string | string[] | undefined) => typeof value === "string" ? value.trim().slice(0, 100) : "";
const escapedLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");

export default async function BusinessDirectoryPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const q = one(params.q), area = one(params.area), category = one(params.category);
  const order = one(params.order), review = one(params.review), actionError = one(params.business_error);
  type ActionNotice = { role: "status" | "alert"; tone: "neutral" | "success" | "warning" | "danger"; message: string; href?: string; linkLabel?: string };
  let actionNotice: ActionNotice | null = null;
  if (actionError === "verify-email") actionNotice = { role: "alert", tone: "warning", message: "Verify your email before submitting a business review or order request.", href: "/login?next=%2Fbusiness-directory", linkLabel: "Sign in to continue" };
  else if (actionError === "invalid-review") actionNotice = { role: "alert", tone: "danger", message: "Your review was not submitted. Check the rating and try again." };
  else if (actionError === "already-reviewed") actionNotice = { role: "status", tone: "neutral", message: "You have already submitted a review for this business." };
  else if (actionError === "review-unavailable") actionNotice = { role: "alert", tone: "warning", message: "We could not confirm whether your review was saved. Check the business page before submitting again." };
  else if (order === "requested") actionNotice = { role: "status", tone: "success", message: "Your unpaid order request was saved. No payment was taken; the business may follow up using the contact details you provided." };
  else if (order === "invalid") actionNotice = { role: "alert", tone: "danger", message: "Your order request was not submitted. Check the required fields and try again. No payment was taken." };
  else if (order === "unavailable") actionNotice = { role: "alert", tone: "warning", message: "We could not confirm whether your unpaid order request was saved. No payment was taken. Check your orders before trying again.", href: "/business-directory/orders", linkLabel: "View orders" };
  else if (review === "sent") actionNotice = { role: "status", tone: "success", message: "Your review was submitted. It may appear after moderation." };
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
    {actionNotice ? <Notice role={actionNotice.role} tone={actionNotice.tone}>{actionNotice.message}{actionNotice.href ? <> <Link className="ui-text-link" href={actionNotice.href}>{actionNotice.linkLabel}</Link></> : null}</Notice> : null}
    <form action="/business-directory" method="get" role="search" aria-label="Filter published business listings" className="ui-toolbar ui-form-grid filter-panel">
      <div className="filter-panel__heading"><span className="filter-panel__icon"><FilterIcon/></span><div><p className="ui-eyebrow">Refine results</p><h2 className="filter-panel__title">Find a business</h2></div></div>
      <div className="ui-field"><label className="label" htmlFor="directory-q">Business name</label><div className="filter-panel__control"><SearchIcon className="filter-panel__input-icon"/><input id="directory-q" name="q" defaultValue={q} maxLength={100} className="input" placeholder="Name or keyword" /></div></div>
      <div className="ui-field"><label className="label" htmlFor="directory-area">Area (as listed)</label><div className="filter-panel__control"><SearchIcon className="filter-panel__input-icon"/><input id="directory-area" name="area" defaultValue={area} maxLength={100} className="input" placeholder="Search by area" /></div></div>
      <div className="ui-field"><label className="label" htmlFor="directory-category">Category</label><select id="directory-category" name="category" defaultValue={category} className="input"><option value="">All categories</option>{categories.map(item => <option key={item.slug} value={item.slug}>{item.label}</option>)}</select></div>
      <div className="ui-actions"><button className="btn-primary" type="submit"><SearchIcon size={16}/>Search listings</button><Link className="btn-secondary" href="/business-directory">Clear filters</Link></div>
    </form>
    {failed ? <EmptyPanel title="The directory could not be loaded" description="Please try again later. No listing data is shown." /> : businesses.length === 0 ? <EmptyPanel title="No published businesses match this search" description="Try changing the search, or check back after a business has been approved for publication." /> : <section className="ui-stack-sm" aria-label="Directory results"><p className="ui-meta">{businesses.length} {businesses.length === 1 ? "published listing" : "published listings"}{businesses.length === 100 ? " · showing up to 100" : ""}</p><ul className="ui-grid ui-grid--2 ui-list">{businesses.map(business => <li key={business.slug}><Panel className="ui-card ui-stack-sm">{business.sponsored ? <StatusBadge>Sponsored</StatusBadge> : null}<p className="ui-eyebrow">{business.category_label}</p><h2 className="ui-item-title"><Link href={`/business-directory/${encodeURIComponent(business.slug)}`}>{business.name}</Link></h2>{business.is_verified ? <StatusBadge tone="success">Verified</StatusBadge> : null}{business.description ? <p className="ui-muted">{business.description}</p> : null}<dl className="ui-list ui-meta">{business.area ? <div><dt>Area</dt><dd>{business.area}</dd></div> : null}{business.address ? <div><dt>Address</dt><dd>{business.address}</dd></div> : null}{business.phone ? <div><dt>Phone</dt><dd><a href={`tel:${business.phone}`}>{business.phone}</a></dd></div> : null}{business.website ? <div><dt>Website</dt><dd><a href={business.website} rel="noreferrer">Visit website</a></dd></div> : null}</dl><Link className="btn-secondary" href={`/business-directory/${encodeURIComponent(business.slug)}`}>View business profile</Link></Panel></li>)}</ul></section>}
  </PageFrame>;
}
