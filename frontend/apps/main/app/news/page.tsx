import type { Metadata } from "next";
import Link from "next/link";
import { createClient, SupabaseConfigurationError } from "../../lib/supabase";
import { formatPublishedDate } from "../../lib/dates";
import { publicMediaUrl } from "../../lib/media";
import { selectedNewsCover } from "../../lib/news-covers";
import { absoluteUrl } from "../../lib/site";
import { newsArticlePath } from "../../lib/news-urls";
import { NewspaperIcon } from "../../components/icons";
import { EmptyPanel, PageFrame, StatusBadge } from "../../components/design-system";
import NewsFooter from "../../components/news-footer";
import NewsletterUnavailable from "../../components/newsletter-unavailable";
import styles from "./news.module.css";

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
const topicImages = [
  "/hero/01-epe-epe-jpg.jpg",
  "/hero/05-epe-aiyetoro-market-at-epe-jpg.jpg",
  "/hero/09-epe-adesowon-junior-and-senior-grammar-school-ilara-epe-jpg.jpg",
  "/hero/03-epe-fish-monoment-in-epe-lagos-nigeria-3-jpg.jpg",
  "/hero/04-epe-iberekodo-beach-epe-lagos-jpg.jpg",
  "/hero/07-epe-boy-building-a-canoe-jpg.jpg",
];
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
  const breakingLead = page === 1 ? articles.find(isBreakingNow) : undefined;
  const lead = page === 1 ? (breakingLead ?? articles[0] ?? null) : null;
  const remaining = lead ? articles.filter((article) => article.slug !== lead.slug) : articles;
  const topHeadlines = remaining.slice(0, 4);
  const latestStories = remaining.slice(4, 7);
  const moreStories = remaining.slice(7);
  const heading = category ? categories.find((item) => item.slug === category)?.label ?? "News" : query ? "Search results" : "Latest News";

  return <>
    <PageFrame className={`${styles.newsPage} ui-stack`}>
      <div className={styles.newsTopBar}>
        <p className={styles.publisherStamp}><span className={styles.publisherDot} aria-hidden="true" />Reporting and community information from Epe</p>
        <details className={styles.searchToggle} open={searchOpen || undefined}>
          <summary className={styles.searchSummary} aria-label="Search headlines" title="Search headlines">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg>
            <span>Search</span>
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
      </div>

      <header className={styles.pageHeader}>
        <p className={styles.kicker}>EPE LAWA · NEWSROOM</p>
        <h1 className={styles.pageTitle}>{heading}</h1>
        <nav className={styles.categoryNav} aria-label="News categories"><ul className={styles.categoryList}>
          <li><Link href={categoryHref(query, "")} aria-current={!category ? "page" : undefined} className={styles.categoryLink}>All</Link></li>
          {categories.map((item) => <li key={item.slug}><Link href={categoryHref(query, item.slug)} aria-current={category === item.slug ? "page" : undefined} className={styles.categoryLink}>{item.label}</Link></li>)}
        </ul></nav>
      </header>

      {breakingLead ? <section className={styles.breakingBanner} aria-label="Breaking news">
        <span className={styles.breakingLabel}>Breaking</span>
        <Link href={newsArticlePath(breakingLead.slug)}>{breakingLead.title}</Link>
        <span className={styles.breakingMeta}>Published {formatPublishedDate(breakingLead.published_at)}</span>
      </section> : null}

      {articles.length === 0 ? (
        <EmptyPanel
          title={category ? "No published stories in this category" : query ? "No matching stories" : "No stories published yet"}
          description={category ? "There are no published stories in this category yet." : query ? "Try a different headline search. No unpublished stories are shown." : "When the newsroom publishes a story, it will appear here with its byline, date and category."}
          actions={needsReset ? (
            <>
              <Link href="/news" className="btn-secondary">{hasSearchOrCategory ? "Clear search and filters" : "Back to latest stories"}</Link>
              <Link href="/" className="btn-secondary">Explore EPE LAWA</Link>
            </>
          ) : <Link href="/" className="btn-secondary">Explore EPE LAWA</Link>}
        />
      ) : <div className={styles.newsPageGrid}>
        <div className={styles.newsMain}>
          <div className={styles.leadGrid}>
            {lead ? <section className={styles.featureSection} aria-label="Lead story">
              <Link href={newsArticlePath(lead.slug)} className={styles.featureCard} aria-label={`Read: ${lead.title}`}>
                {coverUrl(lead) ? <img className={styles.featureImage} src={coverUrl(lead) ?? undefined} alt="" loading="eager" fetchPriority="high" decoding="async" referrerPolicy="no-referrer" /> : <span className={styles.featureImageFallback} aria-hidden="true"><NewspaperIcon size={42} /></span>}
                <span className={styles.featureShade} aria-hidden="true" />
                <span className={styles.featureCopy}>
                  <span className={styles.featureCategory}>{lead.category_label}{isBreakingNow(lead) ? <StatusBadge tone="warning">Breaking</StatusBadge> : null}</span>
                  <span className={styles.featureTitle}>{lead.title}</span>
                  {lead.summary ? <span className={styles.featureSummary}>{lead.summary}</span> : null}
                  <span className={styles.featureMeta}>By {lead.author_name}{lead.published_at ? <> · <time dateTime={lead.published_at}>{formatPublishedDate(lead.published_at)}</time></> : null}</span>
                  <span className={styles.featureAction}>Read full story <span aria-hidden="true">→</span></span>
                </span>
              </Link>
            </section> : null}

            {topHeadlines.length ? <section className={styles.headlineRail} aria-labelledby="top-headlines-heading">
              <div className={styles.sectionHeading}><h2 id="top-headlines-heading">Top Headlines</h2><Link href="/news" className={styles.sectionLink}>See all <span aria-hidden="true">→</span></Link></div>
              <ul className={styles.headlineList}>{topHeadlines.map((article) => {
                const image = coverUrl(article);
                return <li className={styles.headlineItem} key={article.slug}><Link href={newsArticlePath(article.slug)} className={styles.headlineLink}>
                  {image ? <img className={styles.headlineImage} src={image} alt="" loading="eager" decoding="async" referrerPolicy="no-referrer" /> : <span className={styles.headlineImageFallback} aria-hidden="true"><NewspaperIcon size={18} /></span>}
                  <span className={styles.headlineCopy}><span className={styles.headlineCategory}>{article.category_label}{isBreakingNow(article) ? <StatusBadge tone="warning">Breaking</StatusBadge> : null}</span><span className={styles.headlineTitle}>{article.title}</span><span className={styles.headlineMeta}>{formatPublishedDate(article.published_at)}</span></span>
                </Link></li>;
              })}</ul>
            </section> : null}
          </div>

          {latestStories.length ? <section className={styles.latestSection} aria-labelledby="latest-heading">
            <div className={styles.sectionHeading}><h2 id="latest-heading">Latest Stories</h2><span>{articles.length} stories loaded</span></div>
            <ul className={styles.latestGrid}>{latestStories.map((article) => {
              const image = coverUrl(article);
              return <li className={styles.storyCard} key={article.slug}><Link href={newsArticlePath(article.slug)} className={styles.storyCardLink}>
                <span className={styles.storyImageWrap}>{image ? <img className={styles.storyImage} src={image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" /> : <span className={styles.storyImageFallback} aria-hidden="true"><NewspaperIcon size={28} /></span>}</span>
                <span className={styles.storyCardCopy}><span className={styles.storyCategory}>{article.category_label}</span><span className={styles.storyTitle}>{article.title}</span><span className={styles.storySummary}>{article.summary || ""}</span><span className={styles.storyMeta}>By {article.author_name}{article.published_at ? <> · <time dateTime={article.published_at}>{formatPublishedDate(article.published_at)}</time></> : null}</span></span>
              </Link></li>;
            })}</ul>
          </section> : null}

          <Link className={styles.discoverBanner} href="/tourism">
            <span className={styles.discoverBannerImage}><img src="/epe-iberekodo-beach.jpg" alt="Iberekodo Beach in Epe" loading="lazy" decoding="async" /></span>
            <span className={styles.discoverBannerShade} aria-hidden="true" />
            <span className={styles.discoverBannerCopy}><span className={styles.asideEyebrow}>Discover Epe</span><strong>Discover the Beauty of Epe</strong><span>Explore the culture, history, people and opportunities of Epe.</span><span className={styles.discoverBannerAction}>Explore Epe <span aria-hidden="true">→</span></span></span>
          </Link>

          {categories.length ? <section className={styles.topicSection} aria-labelledby="topics-heading">
            <div className={styles.sectionHeading}><h2 id="topics-heading">Explore Topics</h2><span>Browse the newsroom</span></div>
            <ul className={styles.topicGrid}>{categories.slice(0, topicImages.length).map((item, index) => <li key={item.slug} className={styles.topicItem}>
              <Link href={categoryHref(query, item.slug)} className={styles.topicLink} aria-label={`Browse ${item.label} news`}>
                <span className={styles.topicImage}><img src={topicImages[index]} alt="" loading="lazy" decoding="async" /></span>
                <span className={styles.topicLabel}>{item.label}</span>
              </Link>
            </li>)}</ul>
          </section> : null}

          {moreStories.length ? <section className={styles.moreSection} aria-labelledby="more-heading">
            <div className={styles.sectionHeading}><h2 id="more-heading">More Stories</h2></div>
            <ul className={styles.storyList}>{moreStories.map((article) => {
              const image = coverUrl(article);
              return <li className={styles.storyRow} key={article.slug}><Link href={newsArticlePath(article.slug)} className={styles.storyLink}>
                {image ? <img className={styles.storyThumbnail} src={image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" /> : <span className={styles.storyThumbnailFallback} aria-hidden="true"><NewspaperIcon size={22} /></span>}
                <span className={styles.storyCopy}><span className={styles.storyCategory}>{article.category_label}{isBreakingNow(article) ? <StatusBadge tone="warning">Breaking</StatusBadge> : null}</span><span className={styles.storyTitle}>{article.title}</span><span className={styles.storyMeta}>By {article.author_name}{article.published_at ? <> · <time dateTime={article.published_at}>{formatPublishedDate(article.published_at)}</time></> : null}</span></span>
              </Link></li>;
            })}</ul>
          </section> : null}

          {page > 1 || hasOlder ? <nav className={styles.pagination} aria-label="News pages">{page > 1 ? <Link className="btn-secondary" href={pageHref(page - 1, query, category)}>Newer stories</Link> : null}<span className={styles.pageNumber} aria-live="polite">Page {page}</span>{hasOlder ? <Link className="btn-secondary" href={pageHref(page + 1, query, category)}>Older stories</Link> : null}</nav> : null}
        </div>

        <aside className={styles.newsAside} aria-label="News updates and topics">
          <section className={styles.newsletterCard} aria-labelledby="newsletter-heading">
            <p className={styles.asideEyebrow}>Stay informed</p>
            <h2 id="newsletter-heading">EPE LAWA Newsletter</h2>
            <p className={styles.asideCopy}>Newsletter delivery is not configured, so sign-up is paused.</p>
            <NewsletterUnavailable id="news-sidebar-signup" />
          </section>
          {categories.length ? <section className={styles.popularCard} aria-labelledby="popular-heading"><h2 id="popular-heading">Popular Topics</h2><ul>{categories.slice(0, 8).map((item) => <li key={item.slug}><Link href={categoryHref(query, item.slug)}>{item.label}</Link></li>)}</ul></section> : null}
        </aside>
      </div>}
    </PageFrame>
    <NewsFooter categories={categories} />
  </>;
}
