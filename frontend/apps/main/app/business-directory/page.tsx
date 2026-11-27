import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { pageMetadata } from "../../lib/metadata";
import { SearchIcon } from "../../components/icons";
import { BusinessCard } from "../../components/business/business-ui";
import { CloseIcon } from "../../components/business/business-icons";
import { DirectoryFilterSheet, DirectorySortSelect } from "../../components/business/directory-controls";
import { DIRECTORY_PAGE_SIZE, SUMMARY_COLUMNS, directoryHref, parseDirectoryQuery, searchTerm, type BusinessSummary, type DirectoryQuery } from "../../lib/business-directory";
import styles from "./directory.module.css";

type Search = Record<string, string | string[] | undefined>;
type Category = { slug: string; label: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<Search> }): Promise<Metadata> {
  const query = parseDirectoryQuery(await searchParams);
  const base = pageMetadata({ title: "Business directory", description: "Discover local businesses around Epe: find trusted services, businesses and organisations, each checked by the EPE LAWA desk before it appears.", path: "/business-directory" });
  // Search, filter, sort and deep pages are useful to visitors but are not separate documents for search engines.
  const variant = Boolean(query.q || query.area || query.verified || query.category || query.sort !== "verified" || query.page > 1);
  return variant ? { ...base, robots: { index: false, follow: true } } : base;
}

async function readDirectory(query: DirectoryQuery) {
  const db = await createClient();
  let list = db.from("published_businesses").select(SUMMARY_COLUMNS, { count: "exact" });
  const term = searchTerm(query.q);
  if (term) {
    const p = `"*${term}*"`;
    list = list.or(`name.ilike.${p},description.ilike.${p},category_label.ilike.${p},area.ilike.${p},address.ilike.${p}`);
  }
  const area = searchTerm(query.area);
  if (area) list = list.or(`area.ilike."*${area}*",address.ilike."*${area}*"`);
  if (query.category) list = list.eq("category_slug", query.category);
  if (query.verified) list = list.eq("is_verified", true);
  if (query.sort === "newest") list = list.order("published_at", { ascending: false, nullsFirst: false });
  else if (query.sort === "verified") list = list.order("is_verified", { ascending: false }).order("name", { ascending: true });
  else list = list.order("name", { ascending: true });
  const from = (query.page - 1) * DIRECTORY_PAGE_SIZE;
  list = list.order("id", { ascending: true }).range(from, from + DIRECTORY_PAGE_SIZE - 1);

  const [result, cats, live] = await Promise.all([
    list,
    db.from("business_categories").select("slug,label").eq("is_active", true).order("sort_order").order("label").limit(100),
    // RLS exposes only live windows (starts_at <= now < ends_at) to the public.
    db.from("business_featured").select("business_id,ends_at").gt("ends_at", new Date().toISOString()).order("ends_at", { ascending: false }).limit(6),
  ]);
  if (result.error || cats.error) {
    console.error("public business directory read failed", { code: result.error?.code ?? cats.error?.code });
    return { failed: true as const };
  }
  const featuredIds = [...new Set(((live.data ?? []) as { business_id: string }[]).map((row) => row.business_id))];
  let featured: BusinessSummary[] = [];
  if (!live.error && featuredIds.length) {
    const rows = await db.from("published_businesses").select(SUMMARY_COLUMNS).in("id", featuredIds);
    if (!rows.error) featured = ((rows.data ?? []) as unknown as BusinessSummary[]).sort((a, b) => featuredIds.indexOf(a.id) - featuredIds.indexOf(b.id));
  }
  return {
    failed: false as const,
    businesses: (result.data ?? []) as unknown as BusinessSummary[],
    total: typeof result.count === "number" ? result.count : null,
    categories: (cats.data ?? []) as Category[],
    featured,
    featuredIds: new Set(featured.map((row) => row.id)),
  };
}

export default async function BusinessDirectoryPage({ searchParams }: { searchParams: Promise<Search> }) {
  const query = parseDirectoryQuery(await searchParams);
  let data: Awaited<ReturnType<typeof readDirectory>>;
  try { data = await readDirectory(query); } catch { data = { failed: true }; }

  const filtered = Boolean(query.q || query.area || query.category || query.verified);
  const categories = data.failed ? [] : data.categories;
  const categoryLabel = categories.find((c) => c.slug === query.category)?.label ?? query.category;
  const totalPages = !data.failed && data.total !== null ? Math.max(1, Math.ceil(data.total / DIRECTORY_PAGE_SIZE)) : null;
  const hasNext = !data.failed && (totalPages !== null ? query.page < totalPages : data.businesses.length === DIRECTORY_PAGE_SIZE);
  const chips: Array<{ label: string; href: string }> = [];
  if (query.q) chips.push({ label: `“${query.q}”`, href: directoryHref({ ...query, q: "", page: 1 }) });
  if (query.category) chips.push({ label: categoryLabel, href: directoryHref({ ...query, category: "", page: 1 }) });
  if (query.area) chips.push({ label: `Area: ${query.area}`, href: directoryHref({ ...query, area: "", page: 1 }) });
  if (query.verified) chips.push({ label: "Verified only", href: directoryHref({ ...query, verified: false, page: 1 }) });
  const showFeatured = !data.failed && data.featured.length > 0 && !filtered && query.page === 1;

  return <div className={`${styles.page} page-full-bleed`}>
    <section className={styles.hero} aria-labelledby="directory-title">
      <div className={styles.container}>
        <p className={styles.eyebrow}>EPE LAWA · Business directory</p>
        <h1 id="directory-title">Discover Local Businesses</h1>
        <p className={styles.lede}>Find trusted services, businesses and organisations around Epe.</p>
        <form action="/business-directory" method="get" role="search" aria-label="Search published business listings" className={styles.search}>
          <label htmlFor="directory-q" className="sr-only">Search businesses, services or locations</label>
          <span className={styles.searchIcon} aria-hidden="true"><SearchIcon size={20} /></span>
          <input id="directory-q" name="q" type="search" defaultValue={query.q} maxLength={100} placeholder="Search businesses, services or locations" autoComplete="off" enterKeyHint="search" data-slash-focus />
          {query.category ? <input type="hidden" name="category" value={query.category} /> : null}
          {query.area ? <input type="hidden" name="area" value={query.area} /> : null}
          {query.verified ? <input type="hidden" name="verified" value="1" /> : null}
          {query.sort !== "verified" ? <input type="hidden" name="sort" value={query.sort} /> : null}
          {query.q ? <Link className={styles.searchClear} href={directoryHref({ ...query, q: "", page: 1 })} aria-label="Clear search text"><CloseIcon /></Link> : null}
          <button type="submit">Search</button>
        </form>
        <p className={styles.heroFoot}>Every listing is checked by the EPE LAWA desk before it appears. <Link href="/business-directory/submit">List your business <span aria-hidden="true">→</span></Link></p>
      </div>
    </section>

    {categories.length > 0 ? <nav className={styles.categories} aria-label="Business categories">
      <div className={styles.container}>
        <ul className={styles.categoryList}>
          <li><Link href={directoryHref({ ...query, category: "", page: 1 })} aria-current={!query.category ? "page" : undefined}>All</Link></li>
          {categories.map((c) => <li key={c.slug}><Link href={directoryHref({ ...query, category: c.slug, page: 1 })} aria-current={query.category === c.slug ? "page" : undefined}>{c.label}</Link></li>)}
        </ul>
      </div>
    </nav> : null}

    <div className={styles.container}>
      {showFeatured && !data.failed ? <section className={styles.section} aria-labelledby="directory-featured">
        <div className={styles.sectionHead}>
          <h2 id="directory-featured">Featured businesses</h2>
          <p>Paid placements, labelled as such and reviewed by the desk.</p>
        </div>
        <ul className={styles.grid}>{data.featured.map((b) => <li key={b.id}><BusinessCard business={b} featured /></li>)}</ul>
      </section> : null}

      <section className={styles.section} aria-labelledby="directory-results">
        <div className={styles.toolbar}>
          <div className={styles.toolbarTitle}>
            <h2 id="directory-results">{filtered ? "Search results" : "All businesses"}</h2>
            {!data.failed && data.total !== null ? <p role="status">{data.total === 1 ? "1 business" : `${data.total} businesses`}{totalPages && totalPages > 1 ? ` · page ${query.page} of ${totalPages}` : ""}</p> : null}
          </div>
          {!data.failed ? <div className={styles.toolbarControls}><DirectorySortSelect query={query} /><DirectoryFilterSheet query={query} /></div> : null}
        </div>
        {chips.length ? <ul className={styles.chips} aria-label="Active filters">
          {chips.map((chip) => <li key={chip.label}><Link href={chip.href} aria-label={`Remove filter ${chip.label}`}>{chip.label}<CloseIcon size={14} /></Link></li>)}
          <li><Link className={styles.clearAll} href="/business-directory">Clear all</Link></li>
        </ul> : null}

        {data.failed ? <div className={styles.state} role="alert">
          <h3>We couldn’t load the directory</h3>
          <p>Please try again. Your search has not been lost.</p>
          <Link className="btn-primary" href={directoryHref(query)}>Try again</Link>
        </div> : data.businesses.length === 0 ? <div className={styles.state}>
          <h3>{filtered ? "No businesses found" : query.page > 1 ? "No more businesses" : "No businesses are published yet"}</h3>
          <p>{filtered ? (query.category && !query.q && !query.area && !query.verified ? `There are no published listings in ${categoryLabel} yet.` : "Try a different search term or remove some filters.") : query.page > 1 ? "You have reached the end of the directory." : "Approved local listings will appear here."}</p>
          <div className={styles.stateActions}>
            {filtered || query.page > 1 ? <Link className="btn-primary" href="/business-directory">{filtered ? "Clear filters" : "Back to the first page"}</Link> : null}
            <Link className="btn-secondary" href="/business-directory/submit">List your business</Link>
          </div>
        </div> : <>
          <ul className={styles.grid}>{data.businesses.map((b) => <li key={b.id}><BusinessCard business={b} featured={data.featuredIds.has(b.id)} /></li>)}</ul>
          {query.page > 1 || hasNext ? <nav className={styles.pagination} aria-label="Business directory pages">
            {query.page > 1 ? <Link href={directoryHref({ ...query, page: query.page - 1 })} rel="prev">← Previous</Link> : <span />}
            <span>Page {query.page}{totalPages ? ` of ${totalPages}` : ""}</span>
            {hasNext ? <Link href={directoryHref({ ...query, page: query.page + 1 })} rel="next">Next →</Link> : <span />}
          </nav> : null}
        </>}
      </section>

      <section className={styles.callout} aria-labelledby="directory-own">
        <div>
          <h2 id="directory-own">Run a business in Epe?</h2>
          <p>Send your details and the desk will check them before the listing is published.</p>
        </div>
        <div className={styles.calloutActions}>
          <Link className="btn-primary" href="/business-directory/submit">List your business</Link>
          <Link className="btn-ghost" href="/support">Report incorrect information</Link>
        </div>
      </section>
    </div>
  </div>;
}
