import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, SupabaseConfigurationError } from "../../lib/supabase";
import { formatPublishedDate } from "../../lib/dates";
import { publicMediaUrl } from "../../lib/media";
import { selectedNewsCover } from "../../lib/news-covers";
import { absoluteUrl } from "../../lib/site";
import { newsArticlePath } from "../../lib/news-urls";
import { NewspaperIcon } from "../../components/icons";
import { EmptyPanel, PageFrame, StatusBadge } from "../../components/design-system";
import NewsFooter from "../../components/news-footer";
import styles from "./listing.module.css";

type ArticleListItem = {
  slug: string;
  title: string;
  summary: string | null;
  published_at: string | null;
  is_breaking: boolean;
  breaking_until: string | null;
  author_name: string;
  category_slug: string;
  category_label: string;
  og_image_key: string | null;
};
type NewsCategory = { slug: string; label: string };
type SearchParams = { q?: string | string[]; page?: string | string[]; category?: string | string[]; search?: string | string[] };

const newsIndexUrl = absoluteUrl("/news");
const newsDescription = "Source-backed reporting from Epe and its connected communities.";
export const metadata: Metadata = {
  title: "News",
  description: newsDescription,
  alternates: { canonical: newsIndexUrl },
  openGraph: { type: "website", title: "EPE LAWA News", description: newsDescription, url: newsIndexUrl },
};

const PAGE_SIZE = 30;
const MAX_PAGE = 1000;
const MAX_CATEGORIES = 100;
export const dynamic = "force-dynamic";

function isBreakingNow(item: ArticleListItem): boolean {
  return item.is_breaking && !!item.breaking_until && new Date(item.breaking_until).getTime() > Date.now();
}
function escapeLike(value: string): string { return value.replace(/[\\%_]/g, "\\$&"); }
function safePage(value: string | string[] | undefined): number {
  if (typeof value !== "string" || !/^\d{1,6}$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? Math.min(page, MAX_PAGE) : 1;
}
function safeCategory(value: string | string[] | undefined): string {
  return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? value : "";
}
function pageHref(page: number, query: string, category: string): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `/news?${suffix}` : "/news";
}
function categoryHref(query: string, category: string): string { return pageHref(1, query, category); }
function fallbackCategories(articles: ArticleListItem[]): NewsCategory[] {
  const labels = new Map<string, string>();
  for (const article of articles) labels.set(article.category_slug, article.category_label);
  return [...labels].map(([slug, label]) => ({ slug, label }));
}
function coverUrl(article: ArticleListItem): string | null {
  return selectedNewsCover(article.og_image_key)?.url ?? publicMediaUrl(article.og_image_key);
}

function NewsError() {
  return <>
    <PageFrame className={`${styles.newsPage} ui-stack`}>
      <header className={styles.pageHeader}><p className={styles.kicker}>EPE LAWA · NEWSROOM</p><h1 className={styles.pageTitle}>News</h1></header>
      <EmptyPanel title="The newsroom did not load" description="We could not reach the published newsroom, so no stories are shown rather than a guess. Try again in a moment." actions={<Link href="/news" className="btn-secondary">Reload the newsroom</Link>} />
    </PageFrame>
    <NewsFooter />
  </>;
}

export default async function NewsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const searchOpen = query.length > 0 || params.search === "1";
  const category = safeCategory(params.category);
  const page = safePage(params.page);
  const hasSearchOrCategory = Boolean(query || category);
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
    if (category) target.set("category", category);
    redirect(`/dashboard?${target.toString()}`);
  }

  let articleQuery = supabase.from("published_articles")
    .select("slug,title,summary,published_at,is_breaking,breaking_until,author_name,category_slug,category_label,og_image_key")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("slug", { ascending: true });
  if (query) articleQuery = articleQuery.ilike("title", `%${escapeLike(query)}%`);
  if (category) articleQuery = articleQuery.eq("category_slug", category);

  const [articleResult, categoryResult] = await Promise.all([
    articleQuery.range(start, start + PAGE_SIZE),
    supabase.from("categories").select("slug,label").eq("is_active", true).order("sort_order", { ascending: true }).order("label", { ascending: true }).limit(MAX_CATEGORIES),
  ]);
  if (articleResult.error) {
    console.error("published_articles list read failed", { code: articleResult.error.code });
    return <NewsError />;
  }
  if (categoryResult.error) console.error("news categories read failed", { code: categoryResult.error.code });

  const rows = (articleResult.data ?? []) as ArticleListItem[];
  const articles = rows.slice(0, PAGE_SIZE);
  const hasOlder = rows.length > PAGE_SIZE && page < MAX_PAGE;
  const categories = (categoryResult.data?.length ? categoryResult.data : fallbackCategories(articles)) as NewsCategory[];
  const breakingStories = page === 1 ? articles.filter(isBreakingNow) : [];
  const breakingLead = breakingStories[0];
  const lead = page === 1 ? (breakingLead ?? articles[0] ?? null) : null;
  const remaining = lead ? articles.filter((article) => article.slug !== lead.slug) : articles;
  const heading = category ? categories.find((item) => item.slug === category)?.label ?? "News" : query ? "Search results" : "Latest News";

  return <>
    <PageFrame className={`${styles.newsPage} ui-stack`}>
      <header className={styles.pageHeader}>
        <div className={styles.headingCopy}>
          <p className={styles.kicker}>EPE LAWA <span aria-hidden="true">/</span> NEWSROOM</p>
          <h1 className={styles.pageTitle}>{heading}</h1>
          <p className={styles.pageDescription}>Reporting, stories and updates from Epe and its communities.</p>
        </div>
        <details className={styles.searchToggle} open={searchOpen || undefined}>
          <summary className={styles.searchSummary} aria-label="Search headlines" title="Search headlines">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg>
            <span>Search stories</span>
          </summary>
          <search className={styles.searchRegion} aria-label="Search published stories">
            <form action="/news" method="get" className={styles.newsSearchForm}>
              <label className="sr-only" htmlFor="news-query">Search headlines</label>
              <input id="news-query" name="q" type="search" maxLength={100} defaultValue={query} placeholder="Search headlines" />
              {category ? <input type="hidden" name="category" value={category} /> : null}
              <button type="submit" className="btn-secondary">Search</button>
            </form>
          </search>
        </details>
      </header>

      <div className={styles.filterBar}>
        <div><strong>Explore the newsroom</strong><span>Browse published reporting by topic</span></div>
        <nav className={styles.categoryNav} aria-label="News categories">
          <details className={styles.categoryDropdown}>
            <summary className={styles.categorySummary}><span><small>Category</small>{categories.find((item) => item.slug === category)?.label ?? "All news"}</span><span aria-hidden="true">⌄</span></summary>
            <ul className={styles.categoryList}>
              <li><Link href={categoryHref(query, "")} aria-current={!category ? "page" : undefined} className={styles.categoryLink}>All</Link></li>
              {categories.map((item) => <li key={item.slug}><Link href={categoryHref(query, item.slug)} aria-current={category === item.slug ? "page" : undefined} className={styles.categoryLink}>{item.label}</Link></li>)}
            </ul>
          </details>
        </nav>
      </div>

      {breakingStories.length ? <section className={styles.breakingBanner} aria-label="Breaking news">
        <span className={styles.breakingLabel}><span aria-hidden="true" className={styles.liveDot} /> Breaking news</span>
        <ul>{breakingStories.map((story) => <li key={story.slug}><Link href={newsArticlePath(story.slug)}>{story.title}</Link>{story.published_at ? <time dateTime={story.published_at}>{formatPublishedDate(story.published_at)}</time> : null}</li>)}</ul>
      </section> : null}

      {articles.length === 0 ? <EmptyPanel
        title={category ? "No published stories in this category" : query ? "No matching stories" : "No stories published yet"}
        description={category ? "There are no published stories in this category yet." : query ? "Try a different headline search. No unpublished stories are shown." : "When the newsroom publishes a story, it will appear here with its byline, date and category."}
        actions={needsReset ? <><Link href="/news" className="btn-secondary">{hasSearchOrCategory ? "Clear search and filters" : "Back to latest stories"}</Link><Link href="/" className="btn-secondary">Explore EPE LAWA</Link></> : <Link href="/" className="btn-secondary">Explore EPE LAWA</Link>}
      /> : <>
        {lead ? <section className={styles.featureSection} aria-labelledby="featured-heading">
          <div className={styles.sectionHeading}><h2 id="featured-heading">Featured story</h2><span>From the newsroom</span></div>
          <article className={styles.featureCard}>
            <Link href={newsArticlePath(lead.slug)} className={styles.featureMedia} tabIndex={-1} aria-hidden="true">
              {coverUrl(lead) ? <img className={styles.featureImage} src={coverUrl(lead) ?? undefined} alt="" loading="eager" fetchPriority="high" decoding="async" referrerPolicy="no-referrer" /> : <span className={styles.imageFallback}><NewspaperIcon size={40} /></span>}
            </Link>
            <div className={styles.featureCopy}>
              <div className={styles.categoryLabel}>{lead.category_label}{isBreakingNow(lead) ? <StatusBadge tone="warning">Breaking</StatusBadge> : null}</div>
              <h3 className={styles.featureTitle}><Link href={newsArticlePath(lead.slug)}>{lead.title}</Link></h3>
              {lead.summary ? <p className={styles.featureSummary}>{lead.summary}</p> : null}
              <p className={styles.storyMeta}>By {lead.author_name}{lead.published_at ? <> <span aria-hidden="true">·</span> <time dateTime={lead.published_at}>{formatPublishedDate(lead.published_at)}</time></> : null}</p>
              <Link href={newsArticlePath(lead.slug)} className={styles.readLink} aria-label={`Read: ${lead.title}`}>Read full story <span aria-hidden="true">→</span></Link>
            </div>
          </article>
        </section> : null}
        {remaining.length ? <section className={styles.storiesSection} aria-labelledby="stories-heading">
          <div className={styles.sectionHeading}><h2 id="stories-heading">{lead ? "Latest stories" : "Stories"}</h2><span>{articles.length} on this page</span></div>
          <ul className={styles.storyGrid}>{remaining.map((article) => {
            const image = coverUrl(article);
            return <li key={article.slug}><article className={styles.storyCard}>
              <Link href={newsArticlePath(article.slug)} className={styles.storyMedia} tabIndex={-1} aria-hidden="true">
                {image ? <img className={styles.storyImage} src={image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" /> : <span className={styles.imageFallback}><NewspaperIcon size={28} /></span>}
              </Link>
              <div className={styles.storyCopy}>
                <div className={styles.categoryLabel}>{article.category_label}{isBreakingNow(article) ? <StatusBadge tone="warning">Breaking</StatusBadge> : null}</div>
                <h3 className={styles.storyTitle}><Link href={newsArticlePath(article.slug)}>{article.title}</Link></h3>
                {article.summary ? <p className={styles.storySummary}>{article.summary}</p> : null}
                <p className={styles.storyMeta}>By {article.author_name}{article.published_at ? <> <span aria-hidden="true">·</span> <time dateTime={article.published_at}>{formatPublishedDate(article.published_at)}</time></> : null}</p>
              </div>
            </article></li>;
          })}</ul>
        </section> : null}
      </>}
      {page > 1 || hasOlder ? <nav className={styles.pagination} aria-label="News pages">{page > 1 ? <Link className="btn-secondary" href={pageHref(page - 1, query, category)}>Newer stories</Link> : null}<span className={styles.pageNumber} aria-live="polite">Page {page}</span>{hasOlder ? <Link className="btn-secondary" href={pageHref(page + 1, query, category)}>Older stories</Link> : null}</nav> : null}
    </PageFrame>
    <NewsFooter categories={categories} listing />
  </>;
}
