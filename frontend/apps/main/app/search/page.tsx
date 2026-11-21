import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { SearchIcon } from "../../components/icons";
import { EmptyPanel, PageFrame, PageIntro, SectionHeading, StatusBadge } from "../../components/design-system";
import { pageMetadata } from "../../lib/metadata";

type SearchParams = { q?: string | string[] };

function first(value: string | string[] | undefined): string { return typeof value === "string" ? value : ""; }
function cleanSearch(value: string | string[] | undefined): string {
  return first(value).trim().slice(0, 100).replace(/[^\p{L}\p{N} '\u2019-]/gu, " ").replace(/\s+/g, " ").trim();
}

type Row = Record<string, unknown>;
type SearchBuckets = { articles: Row[]; businesses: Row[]; destinations: Row[]; people: Row[]; threads: Row[] };
const emptyBuckets = (): SearchBuckets => ({ articles: [], businesses: [], destinations: [], people: [], threads: [] });

const LIMITS = { articles: 8, businesses: 6, destinations: 6, people: 6, threads: 6 };

export const metadata: Metadata = pageMetadata({
  title: "Search",
  description: "Search published news stories, businesses, destinations, people and forum threads across EPE LAWA.",
  path: "/search",
});

const title_of = (row: Row): string => String(row.title ?? row.name ?? row.full_name ?? "");

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = cleanSearch(first((await searchParams).q));
  let failed = false;
  const hits = emptyBuckets();
  let total = 0;

  if (!failed && query) {
    try {
      const supabase = await createClient();
      const [articles, businesses, destinations, people, threads] = await Promise.all([
        supabase.from("published_articles").select("slug,title,summary,published_at,category_label")
          .or(`title.ilike.%${query}%,summary.ilike.%${query}%`)
          .order("published_at", { ascending: false, nullsFirst: false }).limit(LIMITS.articles),
        supabase.rpc("business_discovery_search", { p_query: query, p_area: "", p_category: "", p_offset: 0 })
          .select("slug,name,category_label,description,area").limit(LIMITS.businesses),
        supabase.from("tourism_destinations").select("slug,name,location_label")
          .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
          .order("name", { ascending: true }).limit(LIMITS.destinations),
        supabase.from("published_people").select("slug,full_name,preferred_name,is_verified")
          .or(`full_name.ilike.%${query}%,preferred_name.ilike.%${query}%`)
          .order("full_name", { ascending: true }).limit(LIMITS.people),
        supabase.from("forum_threads").select("slug,title,post_count,last_activity_at")
          .ilike("title", `%${query}%`).in("state", ["open", "locked"]).is("deleted_at", null)
          .order("last_activity_at", { ascending: false, nullsFirst: false }).limit(LIMITS.threads),
      ]);
      failed = [articles, businesses, destinations, people, threads].some((result) => Boolean(result.error));
      if (!failed) {
        hits.articles = (articles.data ?? []) as Row[];
        hits.businesses = (businesses.data ?? []) as Row[];
        hits.destinations = (destinations.data ?? []) as Row[];
        hits.people = (people.data ?? []) as Row[];
        hits.threads = (threads.data ?? []) as Row[];
        total = Object.values(hits).reduce((sum, rows) => sum + rows.length, 0);
      }
    } catch { failed = true; }
  }

  const hasResults = !failed && total > 0;
  const searchForm = (
    <form action="/search" method="get" role="search" className="ui-row" aria-label="Search EPE LAWA">
      <label className="ui-field">
        <span className="label">Search the whole site</span>
        <input className="input" type="search" name="q" defaultValue={query} maxLength={100}
          placeholder="Stories, businesses, places, people, discussions" aria-label="Search query" data-slash-focus />
      </label>
      <button className="btn-primary" type="submit" style={{ alignSelf: "end" }}>
        <span className="ui-row" style={{ gap: "0.4rem", alignItems: "center" }}><SearchIcon size={16} /><span>Search</span></span>
      </button>
    </form>
  );

  const sections: Array<{ key: keyof SearchBuckets; eyebrow: string; title: string; href: (row: Row) => string; subline: (row: Row) => string | null }> = [
    {
      key: "articles", eyebrow: "Newsroom", title: "News stories", href: (row) => `/news/${encodeURIComponent(String(row.slug))}`,
      subline: (row) => [row.category_label, typeof row.published_at === "string" ? new Date(row.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : null].filter(Boolean).join(" · ") || null,
    },
    {
      key: "businesses", eyebrow: "Business", title: "Businesses", href: (row) => `/business-directory/${encodeURIComponent(String(row.slug))}`,
      subline: (row) => [row.category_label, row.area].filter(Boolean).join(" · ") || null,
    },
    {
      key: "destinations", eyebrow: "Tourism", title: "Destinations", href: (row) => `/tourism/${encodeURIComponent(String(row.slug))}`,
      subline: (row) => (typeof row.location_label === "string" ? row.location_label : null),
    },
    {
      key: "people", eyebrow: "Who is Who", title: "People", href: (row) => `/who-is-who/${encodeURIComponent(String(row.slug))}`,
      subline: (row) => { const preferred = typeof row.preferred_name === "string" ? row.preferred_name : ""; const verified = row.is_verified ? "Verified profile" : ""; return [preferred, verified].filter(Boolean).join(" · ") || null; },
    },
    {
      key: "threads", eyebrow: "Community", title: "Forum threads", href: (row) => `/forum/thread/${encodeURIComponent(String(row.slug))}`,
      subline: (row) => `${String(row.post_count ?? 0)} ${Number(row.post_count) === 1 ? "post" : "posts"}`,
    },
  ];

  return (
    <PageFrame className="ui-stack">
      <PageIntro
        eyebrow="Find it fast"
        title="Search EPE LAWA"
        description="One search across published news stories, businesses, tourism destinations, people and forum discussions."
        meta={query && !failed ? <StatusBadge tone={hasResults ? "success" : "warning"}>{hasResults ? `${total} matches for “${query}”` : `No matches for “${query}”`}</StatusBadge> : undefined}
      />
      {searchForm}

      {failed ? (
        <EmptyPanel
          title="The search index could not be reached"
          description="Please try again in a moment. Results are not shown partially, and nothing is guessed."
          actions={<Link className="btn-secondary" href={`/search?q=${encodeURIComponent(query)}`}>Try again</Link>}
        />
      ) : !query ? (
        <section className="ui-stack-sm" aria-label="Search suggestions">
          <SectionHeading eyebrow="Try searching for" title="Where would you like to look?" />
          <ul className="ui-list">
            <li className="ui-item"><h3 className="ui-item-title"><Link href="/news">News stories</Link></h3><p className="ui-muted">Trending and published reporting from the newsroom.</p></li>
            <li className="ui-item"><h3 className="ui-item-title"><Link href="/business-directory">Businesses</Link></h3><p className="ui-muted">Checked listings from around Epe Division.</p></li>
            <li className="ui-item"><h3 className="ui-item-title"><Link href="/tourism">Destinations</Link></h3><p className="ui-muted">Verified historical sites and visitor details.</p></li>
            <li className="ui-item"><h3 className="ui-item-title"><Link href="/who-is-who">People</Link></h3><p className="ui-muted">Sourced profiles of people and office holders.</p></li>
          </ul>
        </section>
      ) : hasResults ? (
        <div className="ui-stack">
          {sections.map((section) => {
            const rows = hits[section.key];
            if (!rows.length) return null;
            return (
              <section key={section.key} className="ui-stack-sm" aria-labelledby={`search-${section.key}`}>
                <SectionHeading id={`search-${section.key}`} eyebrow={section.eyebrow} title={section.title} />
                <ul className="ui-list">
                  {rows.map((row, index) => {
                    const subline = section.subline(row);
                    return (
                      <li className="ui-item" key={`${String(row.slug)}-${index}`}>
                        <h3 className="ui-item-title"><Link href={section.href(row)}>{title_of(row)}</Link></h3>
                        {subline ? <p className="ui-muted">{subline}</p> : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <EmptyPanel
          title="Nothing published matches that search"
          description="Try a shorter phrase, a different spelling, or explore a section directly."
          actions={
            <div className="ui-actions">
              <Link className="btn-secondary" href="/news">Browse News</Link>
              <Link className="btn-secondary" href="/business-directory">Browse Businesses</Link>
            </div>
          }
        />
      )}
    </PageFrame>
  );
}
