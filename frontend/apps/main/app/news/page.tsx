import type { Metadata } from "next";
import { Suspense } from "react";
import NewsNavigationReset from "../../components/news-navigation-reset";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, SupabaseConfigurationError } from "../../lib/supabase";
import { formatPublishedDate } from "../../lib/dates";
import { publishedNewsCover } from "../../lib/published-news-cover";
import { absoluteUrl } from "../../lib/site";
import { newsArticlePath } from "../../lib/news-urls";
import NewsImage from "../../components/news-image";
import HomeLivePill from "../../components/home-live-pill";
import ArticleByline from "../../components/article-byline";
import StoryStats from "../../components/story-stats";
import { loadEngagementMap } from "../../lib/article-engagement";
import { BreakingBadge, BreakingNewsBanner } from "../../components/breaking-news";
import LagosLiveClock from "../../components/lagos-live-clock";
import { EmptyPanel, PageFrame } from "../../components/design-system";
import styles from "./listing.module.css";

type ArticleListItem = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  published_at: string | null;
  is_breaking: boolean;
  breaking_until: string | null;
  author_name: string;
  category_slug: string;
  category_label: string;
  cover_url: string | null;
  cover_alt: string | null;
  tags: { slug: string; label: string }[] | null;
};
type SearchParams = { q?: string | string[]; page?: string | string[]; tag?: string | string[]; search?: string | string[] };

const newsIndexUrl = absoluteUrl("/news");
const newsDescription = "News from Epe Division — Epe, Ibeju-Lekki and their LCDAs.";
export const metadata: Metadata = {
  title: "News",
  description: newsDescription,
  alternates: { canonical: newsIndexUrl },
  openGraph: { type: "website", title: "EPE LAWA News", description: newsDescription, url: newsIndexUrl },
};

const PAGE_SIZE = 30;
const MAX_PAGE = 1000;
export const dynamic = "force-dynamic";

function isBreakingNow(item: ArticleListItem): boolean {
  return item.is_breaking && !!item.breaking_until && new Date(item.breaking_until).getTime() > Date.now();
}
function safePage(value: string | string[] | undefined): number {
  if (typeof value !== "string" || !/^\d{1,6}$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? Math.min(page, MAX_PAGE) : 1;
}
function safeSlug(value: string | string[] | undefined): string {
  return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? value : "";
}
function pageHref(page: number, query: string, tag: string): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (tag) params.set("tag", tag);
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `/news?${suffix}` : "/news";
}
function filterHref(query: string, tag = ""): string { return pageHref(1, query, tag); }
function coverUrl(article: ArticleListItem): string | null {
  return publishedNewsCover(article)?.url ?? null;
}

function NewsError() {
  return <>
    <PageFrame className={`${styles.newsPage} ui-stack`}>
      <header className={styles.pageHeader}><p className={styles.kicker}>Latest reporting</p><h1 className={styles.pageTitle}>News</h1></header>
      <EmptyPanel title="The newsroom did not load" description="We could not reach the published newsroom, so no stories are shown rather than a guess. Try again in a moment." actions={<Link href="/news" className="btn-secondary">Reload the newsroom</Link>} />
    </PageFrame>
  </>;
}

export default async function NewsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  // One news section (owner, turn 26): Epe Division only, no categories.
  const tag = safeSlug(params.tag);
  const page = safePage(params.page);
  const hasSearchOrCategory = Boolean(query || tag);
  const needsReset = hasSearchOrCategory || page > 1;
  const start = (page - 1) * PAGE_SIZE;
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try { supabase = await createClient(); }
  catch (error) { if (!(error instanceof SupabaseConfigurationError)) throw error; return <NewsError />; }

  // Members use their Discover feed; direct article links remain canonical and shareable.
  let member = false;
  try {
    const { data, error } = await supabase.auth.getUser();
    member = !error && Boolean(data.user);
  } catch { /* Public news remains available when the session cannot be checked. */ }
  if (member) {
    const target = new URLSearchParams({ tab: "discover" });
    if (query) target.set("q", query);
    if (page > 1) target.set("page", String(page));
    redirect(`/dashboard?${target.toString()}`);
  }

  let articleQuery = supabase.from("published_articles")
    .select("id,slug,title,summary,published_at,is_breaking,breaking_until,author_name,category_slug,category_label,cover_url,cover_alt,tags")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("slug", { ascending: true });
  if (tag && !query) articleQuery = articleQuery.contains("tags", [{ slug: tag }]);

  const now = Date.now();
  // The banner is independent of pagination: older flagged stories can still be breaking.
  const breakingQuery = page === 1 && !hasSearchOrCategory
    ? supabase.from("published_articles").select("slug,title,published_at,breaking_until").eq("is_breaking", true).gt("breaking_until", new Date(now).toISOString()).order("published_at", { ascending: false, nullsFirst: false }).order("slug", { ascending: true }).limit(10)
    : Promise.resolve({ data: [], error: null });
  const [articleResult, breakingResult] = await Promise.all([
    query ? supabase.rpc("search_published_news", { p_query: query, p_category: "", p_offset: start }).select("id,slug,title,summary,published_at,is_breaking,breaking_until,author_name,category_slug,category_label,cover_url,cover_alt,tags") : articleQuery.range(start, start + PAGE_SIZE),
    breakingQuery,
  ]);
  if (articleResult.error) {
    console.error("published_articles list read failed", { code: articleResult.error.code });
    return <NewsError />;
  }

  const rows = (articleResult.data ?? []) as ArticleListItem[];
  const engagement = await loadEngagementMap(supabase, rows.map((row) => row.id));
  const statsFor = (item: ArticleListItem) => { const numbers = engagement.get(item.id); return numbers ? <StoryStats tone="muted" stats={numbers} /> : null; };
  const tagMatch = (item: ArticleListItem) => !tag || (item.tags ?? []).some((item2) => item2.slug === tag);
  const rowsForTag = query && tag ? rows.filter(tagMatch) : rows;
  const articles = rowsForTag.slice(0, PAGE_SIZE);
  const hasOlder = rowsForTag.length > PAGE_SIZE && page < MAX_PAGE;
  if (breakingResult.error) console.error("breaking stories read failed", { code: breakingResult.error.code });
  const breakingStories = breakingResult.data ?? [];
  const breakingLead = page === 1 ? articles.find(isBreakingNow) : null;
  const lead = page === 1 ? (breakingLead ?? articles[0] ?? null) : null;
  const remaining = lead ? articles.filter((article) => article.slug !== lead.slug) : articles;
  const latest = remaining;
  const heading = query ? "Search results" : "News from Epe Division.";
  const tagLabel = tag ? articles.flatMap((article) => article.tags ?? []).find((item) => item.slug === tag)?.label ?? tag.replace(/-/g, " ") : "";

  return <>
    <PageFrame className={`${styles.newsPage} ui-stack`}>
      <Suspense fallback={null}><NewsNavigationReset /></Suspense>
      <header className={styles.pageHeader}>
        <div className={styles.headingCopy}>
          <p className={styles.kicker}>Latest reporting</p>
          <h1 className={styles.pageTitle}>{heading}</h1>
          <p className={styles.pageDescription}>The latest stories, developments and voices from Epe, Ibeju-Lekki, Eredo, Ikosi-Ejinrin and Lekki LCDA.</p>
          <HomeLivePill since={now} label="story" />
        </div>
        <LagosLiveClock initialTime={now} />
      </header>

      {breakingResult.error ? <p role="status">Breaking news is unavailable right now.</p> : <BreakingNewsBanner stories={breakingStories} initialTime={now} />}

      <div className={styles.editorialControls}>
        <form action="/news" method="get" role="search" className={styles.editorialSearch}>
          <label className="sr-only" htmlFor="news-query">Search stories, topics and authors</label>
          <input id="news-query" name="q" type="search" maxLength={100} defaultValue={query} placeholder="Search news, topics and authors…" data-slash-focus />
          <button type="submit">Search</button>
        </form>
      </div>

      {tag ? <div className={styles.tagFilterBar} role="status">
        <span>Stories tagged <strong>{tagLabel}</strong></span>
        <Link className={styles.tagFilterClear} href={filterHref(query)}>Clear topic filter</Link>
      </div> : null}

      {articles.length === 0 ? <EmptyPanel
        title={tag ? `No stories tagged ${tagLabel}` : query ? "No matching stories" : "No stories published yet"}
        description={tag ? "No published stories carry this topic yet." : query ? "Try a different search. No unpublished stories are shown." : "When the newsroom publishes a story from Epe Division, it will appear here with its byline and date."}
        actions={needsReset ? <><Link href="/news" className="btn-secondary">{hasSearchOrCategory ? "Clear search and filters" : "Back to latest stories"}</Link><Link href="/" className="btn-secondary">Explore EPE LAWA</Link></> : <Link href="/" className="btn-secondary">Explore EPE LAWA</Link>}
      /> : <>
        {lead ? <section className={styles.featureSection} aria-labelledby="featured-heading">
          <div className={styles.sectionHeading}><h2 id="featured-heading">Featured story</h2><span>From the newsroom</span></div>
          <article className={styles.featureCard}>
            <Link href={newsArticlePath(lead.slug)} className={styles.featureMedia} tabIndex={-1} aria-hidden="true">
              <NewsImage className={styles.featureImage} src={coverUrl(lead)} alt="" loading="eager" fetchPriority="high" />
            </Link>
            <div className={styles.featureCopy}>
              {lead.is_breaking ? <div className={styles.categoryLabel}><BreakingBadge until={lead.breaking_until} initialTime={now} /></div> : null}
              <h3 className={styles.featureTitle}><Link href={newsArticlePath(lead.slug)}>{lead.title}</Link></h3>
              {lead.summary ? <p className={styles.featureSummary}>{lead.summary}</p> : null}
              <div className={styles.storyFoot}>{statsFor(lead)}<p className={styles.storyMeta}><ArticleByline name={lead.author_name} />{lead.published_at ? <><span className={styles.metaDot} aria-hidden="true">·</span><time dateTime={lead.published_at}>{formatPublishedDate(lead.published_at)}</time></> : null}</p></div>
              <Link href={newsArticlePath(lead.slug)} className={styles.readLink} aria-label={`Read: ${lead.title}`}>Read full story <span aria-hidden="true">→</span></Link>
            </div>
          </article>
        </section> : null}
        {latest.length ? <section className={styles.storiesSection} aria-labelledby="stories-heading">
          <div className={styles.sectionHeading}><h2 id="stories-heading">{lead ? "Latest reports" : "Stories"}</h2><span>{articles.length} on this page</span></div>
          <ul className={styles.storyGrid}>{latest.map((article) => {
            const image = coverUrl(article);
            return <li key={article.slug}><article className={styles.storyCard}>
              <Link href={newsArticlePath(article.slug)} className={styles.storyMedia} tabIndex={-1} aria-hidden="true">
                <NewsImage className={styles.storyImage} src={image} alt="" />
              </Link>
              <div className={styles.storyCopy}>
                {article.is_breaking ? <div className={styles.categoryLabel}><BreakingBadge until={article.breaking_until} initialTime={now} /></div> : null}
                <h3 className={styles.storyTitle}><Link href={newsArticlePath(article.slug)}>{article.title}</Link></h3>
                {article.summary ? <p className={styles.storySummary}>{article.summary}</p> : null}
                <div className={styles.storyFoot}>{statsFor(article)}<p className={styles.storyMeta}><ArticleByline name={article.author_name} />{article.published_at ? <><span className={styles.metaDot} aria-hidden="true">·</span><time dateTime={article.published_at}>{formatPublishedDate(article.published_at)}</time></> : null}</p></div>
              </div>
            </article></li>;
          })}</ul>
        </section> : null}
      </>}
      {page > 1 || hasOlder || hasSearchOrCategory ? <nav className={styles.pagination} aria-label="News pages">{page > 1 ? <Link className="btn-secondary" href={pageHref(page - 1, query, tag)}>Newer stories</Link> : null}<span className={styles.pageNumber} aria-live="polite">Page {page}</span>{hasOlder ? <Link className="btn-secondary" href={pageHref(page + 1, query, tag)}>Load more news</Link> : null}{hasSearchOrCategory || page > 1 ? <Link className={`${styles.viewAll} btn-primary`} href="/news">View all available news</Link> : null}</nav> : null}
    </PageFrame>
  </>;
}
