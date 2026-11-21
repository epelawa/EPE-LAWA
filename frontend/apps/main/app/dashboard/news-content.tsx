import Link from "next/link";
import SponsorSlot from "../../components/sponsor-slot";
import type { createClient } from "../../lib/supabase";
import { formatPublishedDate } from "../../lib/dates";
import { publishedNewsCover } from "../../lib/published-news-cover";
import NewsImage from "../../components/news-image";
import { ExpiringBreakingList } from "../../components/breaking-news";
import { newsArticlePath } from "../../lib/news-urls";
import { ClockIcon, EyeIcon, MessageCircleIcon } from "../../components/icons";
import { StatusBadge } from "../../components/design-system";
import styles from "./dashboard.module.css";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type PublishedStory = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  published_at: string | null;
  is_breaking: boolean;
  breaking_until: string | null;
  author_name: string | null;
  category_slug: string | null;
  category_label: string | null;
  cover_url: string | null;
  cover_alt: string | null;
};
type NewsCategory = { slug: string; label: string };
type QueryResult<T> = { state: "ok"; items: T[] } | { state: "error"; items: T[] };
type DiscoverResult = QueryResult<PublishedStory> & { categories: QueryResult<NewsCategory>; hasOlder: boolean };

const PAGE_SIZE = 20;
const MAX_PAGE = 1000;
const STORY_COLUMNS = "id,slug,title,summary,published_at,is_breaking,breaking_until,author_name,category_slug,category_label,cover_url,cover_alt";
type StoryEngagement = { view_count: number; comment_count: number; read_minutes: number };

function isActiveBreaking(story: PublishedStory, now = Date.now()): boolean {
  return story.is_breaking && typeof story.breaking_until === "string" && new Date(story.breaking_until).getTime() > now;
}

function safePage(value: string | undefined): number {
  if (!value || !/^\d{1,6}$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? Math.min(page, MAX_PAGE) : 1;
}

function categoryHref(query: string, category: string): string {
  const params = new URLSearchParams({ tab: "discover" });
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  return `/dashboard?${params.toString()}`;
}

function pageHref(page: number, query: string, category: string): string {
  const params = new URLSearchParams({ tab: "discover" });
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  if (page > 1) params.set("page", String(page));
  return `/dashboard?${params.toString()}`;
}

function categoriesFromStories(stories: PublishedStory[]): NewsCategory[] {
  const labels = new Map<string, string>();
  for (const story of stories) if (story.category_slug && story.category_label) labels.set(story.category_slug, story.category_label);
  return [...labels].map(([slug, label]) => ({ slug, label }));
}

async function loadBreaking(client: SupabaseClient): Promise<QueryResult<PublishedStory>> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await client.from("published_articles").select(STORY_COLUMNS)
      .eq("is_breaking", true).gt("breaking_until", now)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("slug", { ascending: true }).limit(5);
    if (error) {
      console.error("member dashboard breaking stories read failed", { code: error.code });
      return { state: "error", items: [] };
    }
    return { state: "ok", items: ((data ?? []) as PublishedStory[]).filter((story) => isActiveBreaking(story)) };
  } catch {
    return { state: "error", items: [] };
  }
}

async function loadRecommendations(client: SupabaseClient): Promise<QueryResult<PublishedStory>> {
  try {
    const { data, error } = await client.from("published_articles").select(STORY_COLUMNS)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("slug", { ascending: true }).limit(50);
    if (error) {
      console.error("member dashboard recommendations read failed", { code: error.code });
      return { state: "error", items: [] };
    }
    return { state: "ok", items: ((data ?? []) as PublishedStory[]).filter((story) => !isActiveBreaking(story)) };
  } catch {
    return { state: "error", items: [] };
  }
}

async function loadDiscover(client: SupabaseClient, query: string, category: string, page: number): Promise<DiscoverResult> {
  try {
    const start = (page - 1) * PAGE_SIZE;
    let articleQuery = client.from("published_articles").select(STORY_COLUMNS)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("slug", { ascending: true });
    if (category) articleQuery = articleQuery.eq("category_slug", category);

    const [articleResult, categoryResult] = await Promise.all([
      query ? client.rpc("search_published_news", { p_query: query, p_category: category, p_offset: start }).select(STORY_COLUMNS).limit(PAGE_SIZE + 1) : articleQuery.range(start, start + PAGE_SIZE),
      client.from("categories").select("slug,label").eq("is_active", true)
        .order("sort_order", { ascending: true }).order("label", { ascending: true }).limit(100),
    ]);
    if (articleResult.error) {
      console.error("member dashboard discover stories read failed", { code: articleResult.error.code });
      return { state: "error", items: [], categories: categoryResult.error ? { state: "error", items: [] } : { state: "ok", items: (categoryResult.data ?? []) as NewsCategory[] }, hasOlder: false };
    }
    const rows = (articleResult.data ?? []) as PublishedStory[];
    const items = rows.slice(0, PAGE_SIZE);
    const storyCategories = categoriesFromStories(items);
    const availableCategories = categoryResult.data?.length ? categoryResult.data as NewsCategory[] : storyCategories;
    return {
      state: "ok",
      items,
      hasOlder: rows.length > PAGE_SIZE && page < MAX_PAGE,
      categories: categoryResult.error
        ? { state: "error", items: availableCategories }
        : { state: "ok", items: availableCategories },
    };
  } catch {
    return { state: "error", items: [], categories: { state: "error", items: [] }, hasOlder: false };
  }
}

async function loadEngagement(client: SupabaseClient, stories: PublishedStory[]): Promise<Map<string, StoryEngagement>> {
  const map = new Map<string, StoryEngagement>();
  if (!stories.length) return map;
  try {
    const { data, error } = await client
      .from("published_article_engagement")
      .select("article_id,view_count,comment_count,read_minutes")
      .in("article_id", stories.map((story) => story.id));
    if (error) {
      console.error("member dashboard story engagement read failed", { code: error.code });
      return map;
    }
    for (const row of (data ?? []) as { article_id: string; view_count: number; comment_count: number; read_minutes: number }[]) {
      if ([row.view_count, row.comment_count, row.read_minutes].some(value => value == null || (typeof value === "string" && !/^\d+$/.test(value)))) continue;
      const viewCount = Number(row.view_count), commentCount = Number(row.comment_count), readMinutes = Number(row.read_minutes);
      if (![viewCount, commentCount, readMinutes].every(Number.isSafeInteger) || viewCount < 0 || commentCount < 0 || readMinutes < 1) continue;
      map.set(row.article_id, { view_count: viewCount, comment_count: commentCount, read_minutes: readMinutes });
    }
  } catch {
    // Covers still render; the engagement chips honestly show an unavailable state.
  }
  return map;
}

function StoryStats({ stats }: { stats?: StoryEngagement }) {
  return <span className={styles.storyStats} role="img" aria-label={stats
    ? `${stats.view_count} views, ${stats.read_minutes} minute read, ${stats.comment_count} comments`
    : "Engagement is unavailable for this story"}>
    <span className={styles.storyStat} title="Unique daily views"><EyeIcon size={13} /><span>{stats ? stats.view_count.toLocaleString("en-NG") : "—"}</span></span>
    <span className={styles.storyStat} title="Estimated read time"><ClockIcon size={13} /><span>{stats ? `${stats.read_minutes} min` : "—"}</span></span>
    <span className={styles.storyStat} title="Comments"><MessageCircleIcon size={13} /><span>{stats ? stats.comment_count.toLocaleString("en-NG") : "—"}</span></span>
  </span>;
}

function storyImage(story: PublishedStory) {
  const cover = publishedNewsCover(story);
  return <NewsImage className={styles.storyImage} src={cover?.url} alt="" />;
}

function StoryMeta({ story }: { story: PublishedStory }) {
  const date = formatPublishedDate(story.published_at);
  const author = story.author_name?.trim();
  return <span className={styles.storyMeta}>{author ? `By ${author}` : "Byline unavailable"}{date ? <> · <time dateTime={story.published_at ?? undefined}>{date}</time></> : null}</span>;
}

function StoryCard({ story, stats }: { story: PublishedStory; stats?: StoryEngagement }) {
  return <li className={styles.storyCard}>
    <Link href={newsArticlePath(story.slug)} className={styles.storyCardLink} aria-label={`Read: ${story.title}`}>
      <span className={styles.storyImageWrap}>{storyImage(story)}<StoryStats stats={stats} /></span>
      <span className={styles.storyCardCopy}>
        <span className={styles.storyCategory}>{story.category_label?.trim() || "News"}</span>
        <span className={styles.storyTitle}>{story.title}</span>
        {story.summary ? <span className={styles.storySummary}>{story.summary}</span> : null}
        <StoryMeta story={story} />
      </span>
    </Link>
  </li>;
}

function BreakingStory({ story, stats }: { story: PublishedStory; stats?: StoryEngagement }) {
  return <Link href={newsArticlePath(story.slug)} className={styles.breakingStory} aria-label={`Read breaking story: ${story.title}`}>
    <span className={styles.breakingImage}>{storyImage(story)}<StoryStats stats={stats} /></span>
    <span className={styles.breakingCopy}>
      <span className={styles.storyCategory}>{story.category_label?.trim() || "News"}<StatusBadge tone="warning">Breaking</StatusBadge></span>
      <strong>{story.title}</strong>
      {story.summary ? <span className={styles.storySummary}>{story.summary}</span> : null}
      <StoryMeta story={story} />
    </span>
  </Link>;
}

function ErrorState({ title, href }: { title: string; href: string }) {
  return <div className={styles.feedError} role="alert">
    <p>{title}</p>
    <span>Published stories could not be loaded. No sample or unpublished stories are shown.</span>
    <Link className="btn-secondary" href={href}>Try again</Link>
  </div>;
}

function HomeSectionHeading({ id, title, helper, level = "h2" }: { id: string; title: string; helper?: string; level?: "h1" | "h2" }) {
  const Heading = level;
  return <header className={styles.feedSectionHeading}>
    <div><p className={styles.eyebrow}>EPE LAWA · NEWS</p><Heading id={id}>{title}</Heading></div>
    {helper ? <p>{helper}</p> : null}
  </header>;
}

export async function DashboardHomeNews({ client }: { client: SupabaseClient }) {
  const [breaking, recommendations] = await Promise.all([loadBreaking(client), loadRecommendations(client)]);
  const engagement = await loadEngagement(client, [...breaking.items, ...recommendations.items]);
  const recommended = recommendations.items.slice(0, 4);
  return <div className={styles.newsFeed}>
    <SponsorSlot compact />
    <section className={styles.feedSection} aria-labelledby="breaking-heading">
      <HomeSectionHeading id="breaking-heading" title="Breaking News" helper="Only stories still marked breaking by the newsroom appear here." level="h1" />
      {breaking.state === "error" ? <ErrorState title="Breaking news is unavailable" href="/dashboard?tab=home" />
        : breaking.items.length ? <ExpiringBreakingList className={styles.breakingList} emptyClassName={styles.feedEmpty} initialTime={Date.now()} items={breaking.items.map((story) => ({ id: story.id, until: story.breaking_until, content: <BreakingStory story={story} stats={engagement.get(story.id)} /> }))} />
        : <p className={styles.feedEmpty}>There are no active breaking stories right now.</p>}
    </section>
    <section className={styles.feedSection} aria-labelledby="recommendations-heading">
      <HomeSectionHeading id="recommendations-heading" title="Recommendations" />
      {recommendations.state === "ok" && recommendations.items.length ? <p className={styles.resultSummary} role="status">Latest stories, excluding breaking news</p> : null}
      {recommendations.state === "error" ? <ErrorState title="Recommendations could not be loaded" href="/dashboard?tab=home" />
        : recommendations.items.length ? <ul className={styles.storyGrid}>{recommended.map((story) => <StoryCard key={story.slug} story={story} stats={engagement.get(story.id)} />)}</ul>
        : <p className={styles.feedEmpty}>No other recent published stories are available to recommend yet.</p>}
      <Link className={styles.seeAllLink} href="/dashboard?tab=discover">Discover all published stories <span aria-hidden="true">→</span></Link>
    </section>
  </div>;
}

export async function DashboardDiscoverNews({ client, query, category, page }: {
  client: SupabaseClient;
  query: string;
  category: string;
  page: number;
}) {
  const result = await loadDiscover(client, query, category, page);
  const engagement = await loadEngagement(client, result.items);
  const retryHref = pageHref(page, query, category);
  const categories = result.categories.items;
  return <div className={styles.newsFeed}>
    <section className={styles.feedSection} aria-labelledby="discover-stories-heading">
      <HomeSectionHeading id="discover-stories-heading" title="Discover" helper="Search and browse only stories published by the EPE LAWA newsroom." level="h1" />
      <form action="/dashboard" method="get" role="search" aria-label="Search published stories" className={styles.searchForm}>
        <input type="hidden" name="tab" value="discover" />
        <label className={styles.searchField}>
          <span>Search stories, topics and authors</span>
          <input type="search" name="q" maxLength={100} defaultValue={query} placeholder="Search stories, topics and authors" />
        </label>
        <label className={styles.searchField}>
          <span>Category</span>
          <select name="category" defaultValue={category}>
            <option value="">All categories</option>
            {categories.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}
          </select>
        </label>
        <button className="btn-primary" type="submit">Search stories</button>
      </form>
      {result.categories.state === "error" ? <p className={styles.categoryWarning} role="status">Story filters are temporarily unavailable; the published story list may still be read.</p> : categories.length ? <nav className={styles.categoryNav} aria-label="Published story categories"><Link className={styles.categoryChip} href={categoryHref(query, "")} aria-current={!category ? "page" : undefined}>All</Link>{categories.map((item) => <Link key={item.slug} className={styles.categoryChip} href={categoryHref(query, item.slug)} aria-current={category === item.slug ? "page" : undefined}>{item.label}</Link>)}</nav> : null}
      {result.state === "error" ? <ErrorState title="Discover stories could not be loaded" href={retryHref} />
        : result.items.length ? <>
          <p className={styles.resultSummary} aria-live="polite">Showing {result.items.length} published {result.items.length === 1 ? "story" : "stories"}{query ? ` matching “${query}”` : ""} on this page.</p>
          <ul className={styles.storyGrid}>{result.items.map((story) => <StoryCard key={story.slug} story={story} stats={engagement.get(story.id)} />)}</ul>
          {page > 1 || result.hasOlder ? <nav className={styles.storyPagination} aria-label="Story pages">
            {page > 1 ? <Link className="btn-secondary" href={pageHref(page - 1, query, category)}>Newer stories</Link> : <span />}
            <span aria-live="polite">Page {page}</span>
            {result.hasOlder ? <Link className="btn-secondary" href={pageHref(page + 1, query, category)}>Older stories</Link> : <span />}
          </nav> : null}
        </> : <div className={styles.feedEmpty}>
          <h3>{query || category ? "No matching published stories" : "No stories published yet"}</h3>
          <p>{query || category ? "Try another search or category. Unpublished newsroom content is never included here." : "When a story is published, it will appear here with its category and byline."}</p>
          {query || category ? <Link className="btn-secondary" href="/dashboard?tab=discover">Clear search and filters</Link> : null}
        </div>}
    </section>
  </div>;
}

export { safePage };
