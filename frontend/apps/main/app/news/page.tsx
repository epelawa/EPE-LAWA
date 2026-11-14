import type { Metadata } from "next";
import Link from "next/link";
import { createClient, SupabaseConfigurationError } from "../../lib/supabase";
import { formatPublishedDate } from "../../lib/dates";
import { publicMediaUrl } from "../../lib/media";
import { absoluteUrl } from "../../lib/site";
import { newsArticlePath } from "../../lib/news-urls";
import { NewspaperIcon } from "../../components/icons";
import { EmptyPanel, PageFrame, StatusBadge } from "../../components/design-system";
import styles from "./news.module.css";

type ArticleListItem = {
  slug: string; title: string; summary: string | null; published_at: string | null;
  is_breaking: boolean; breaking_until: string | null; author_name: string;
  category_slug: string; category_label: string; og_image_key: string | null;
};
type NewsCategory = { slug: string; label: string };
type SearchParams = { q?: string | string[]; page?: string | string[]; category?: string | string[] };
const newsIndexUrl = absoluteUrl("/news");
const newsDescription = "Source-backed reporting from Epe and its connected communities.";
export const metadata: Metadata = {
  title: "News", description: newsDescription, alternates: { canonical: newsIndexUrl },
  openGraph: { type: "website", title: "EPE LAWA News", description: newsDescription, url: newsIndexUrl },
};
const PAGE_SIZE = 30;
const MAX_PAGE = 1000;
const MAX_CATEGORIES = 100;
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
function NewsError() {
  return <PageFrame className={`${styles.newsPage} ui-stack`}>
    <header className={styles.pageHeader}><div><p className={styles.kicker}>EPE LAWA · NEWSROOM</p><h1 className={styles.pageTitle}>News</h1></div></header>
    <EmptyPanel icon={<NewspaperIcon size={28} />} title="The newsroom did not load" description="We could not reach the published newsroom, so no stories are shown rather than a guess. Try again in a moment." actions={<Link href="/news" className="btn-secondary">Reload the newsroom</Link>} />
  </PageFrame>;
}
export default async function NewsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const category = safeCategory(params.category);
  const page = safePage(params.page);
  const start = (page - 1) * PAGE_SIZE;
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try { supabase = await createClient(); }
  catch (error) { if (!(error instanceof SupabaseConfigurationError)) throw error; return <NewsError />; }
  let articleQuery = supabase.from("published_articles")
    .select("slug,title,summary,published_at,is_breaking,breaking_until,author_name,category_slug,category_label,og_image_key")
    .order("published_at", { ascending: false, nullsFirst: false }).order("slug", { ascending: true });
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
  const listArticles = lead ? articles.filter((article) => article.slug !== lead.slug) : articles;
  return <PageFrame className={`${styles.newsPage} ui-stack`}>
    <div className={styles.newsTopBar}>
      <div className={styles.publisherStamp} aria-label="EPE LAWA newsroom">
        <span className={styles.publisherAvatar} aria-hidden="true"><NewspaperIcon size={17} /></span>
        <time className={styles.topDate} dateTime={lead?.published_at ?? undefined}>{formatPublishedDate(lead?.published_at ?? null) || "Latest updates"}</time>
      </div>
      <details className={styles.searchToggle} open={query ? true : undefined}>
        <summary className={styles.searchSummary} aria-label="Search headlines" title="Search headlines">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg>
        </summary>
        <form action="/news" method="get" className={styles.newsSearchForm} role="search" aria-label="Search published stories">
          <label className="sr-only" htmlFor="news-query">Search headlines</label>
          <input id="news-query" name="q" type="search" maxLength={100} defaultValue={query} placeholder="Search headlines" />
          {category ? <input type="hidden" name="category" value={category} /> : null}
          <button type="submit" className="btn-secondary">Search</button>
        </form>
      </details>
    </div>
    <header className={styles.pageHeader}>
      <h1 className={styles.pageTitle}>{lead && isBreakingNow(lead) ? "Breaking News" : "News"}</h1>
    </header>
    {lead ? <section className={styles.featureSection} aria-label="Lead story"><div className={styles.featureCard}>
      <Link href={newsArticlePath(lead.slug)} className={styles.featureLink} aria-label={`Read: ${lead.title}`}>
        {publicMediaUrl(lead.og_image_key) ? <img className={styles.featureImage} src={publicMediaUrl(lead.og_image_key)!} alt="" loading="eager" decoding="async" /> : <span className={styles.featureImageFallback} aria-hidden="true"><NewspaperIcon size={44} /></span>}
      </Link>
      <div className={styles.leadCopy}><p className={styles.featureCategory}>{lead.category_label}{isBreakingNow(lead) ? <StatusBadge tone="warning">Breaking</StatusBadge> : null}</p>
        <h2 className={styles.featureTitle}><Link href={newsArticlePath(lead.slug)}>{lead.title}</Link></h2>
        <p className={styles.featureMeta}>By {lead.author_name}{lead.published_at ? <> · <time dateTime={lead.published_at}>{formatPublishedDate(lead.published_at)}</time></> : null}</p>
      </div>
    </div></section> : null}
    <nav className={styles.categoryNav} aria-label="News categories"><ul className={styles.categoryList}>
      <li><Link href={categoryHref(query, "")} aria-current={!category ? "page" : undefined} className={styles.categoryLink}>All</Link></li>
      {categories.map((item) => <li key={item.slug}><Link href={categoryHref(query, item.slug)} aria-current={category === item.slug ? "page" : undefined} className={styles.categoryLink}>{item.label}</Link></li>)}
    </ul></nav>
    {articles.length === 0 ? <EmptyPanel icon={<NewspaperIcon size={28} />} title={category ? "No published stories in this category" : "No stories published yet"} description={category ? "There are no published stories in this category yet." : "When the newsroom publishes a story, it will appear here with its byline, date and category. Nothing is shown before it exists."} /> : listArticles.length ? <section className={styles.storySection} aria-labelledby="stories-heading">
      <h2 className={styles.listHeading} id="stories-heading">{category ? (categories.find((item) => item.slug === category)?.label ?? "Stories") : "More stories"}</h2>
      <ul className={styles.storyList}>{listArticles.map((article) => {
        const imageUrl = publicMediaUrl(article.og_image_key);
        const date = formatPublishedDate(article.published_at);
        return <li className={styles.storyRow} key={article.slug}><Link href={newsArticlePath(article.slug)} className={styles.storyLink}>
          {imageUrl ? <img className={styles.storyThumbnail} src={imageUrl} alt="" loading="lazy" decoding="async" /> : <span className={styles.storyThumbnailFallback} aria-hidden="true"><NewspaperIcon size={22} /></span>}
          <span className={styles.storyCopy}><span className={styles.storyCategory}>{article.category_label}{isBreakingNow(article) ? <StatusBadge tone="warning">Breaking</StatusBadge> : null}</span>
            <span className={styles.storyTitle}>{article.title}</span><span className={styles.storyMeta}>By {article.author_name}{date ? <> · <time dateTime={article.published_at ?? undefined}>{date}</time></> : null}</span></span>
        </Link></li>;
      })}</ul>
    </section> : null}
    {page > 1 || hasOlder ? <nav className={styles.pagination} aria-label="News pages">{page > 1 ? <Link className="btn-secondary" href={pageHref(page - 1, query, category)}>Newer stories</Link> : null}<span className={styles.sectionMeta} aria-live="polite">Page {page}</span>{hasOlder ? <Link className="btn-secondary" href={pageHref(page + 1, query, category)}>Older stories</Link> : null}</nav> : null}
  </PageFrame>;
}
