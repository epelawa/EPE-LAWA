import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "../../../../lib/supabase";
import { formatPublishedDate } from "../../../../lib/dates";
import { publishedNewsCover } from "../../../../lib/published-news-cover";
import { newsArticlePath } from "../../../../lib/news-urls";
import NewsImage from "../../../../components/news-image";
import { EmptyPanel, PageFrame } from "../../../../components/design-system";
import styles from "../../listing.module.css";

type Props = { params: Promise<{ slug: string }> };

const PAGE_SIZE = 30;
const MAX_PAGE = 1000;
export const dynamic = "force-dynamic";

function safePage(value: string | string[] | undefined): number {
  if (typeof value !== "string" || !/^\d{1,6}$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? Math.min(page, MAX_PAGE) : 1;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { title: "Author" };
  return {
    title: `Stories by ${slug.replace(/-/g, " ")}`,
    description: "Published stories by this author in the EPE LAWA newsroom.",
    alternates: { canonical: `/news/author/${slug}` },
  };
}

export default async function AuthorPage({ params, searchParams }: Props & { searchParams: Promise<{ page?: string | string[] }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) notFound();
  const rawPage = (await searchParams).page;
  const page = safePage(rawPage);
  const start = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const { data, error } = await supabase.from("published_articles")
    .select("slug,title,summary,published_at,is_breaking,breaking_until,author_name,author_slug,category_slug,category_label,cover_url,cover_alt,tags")
    .eq("author_slug", slug)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("slug", { ascending: true })
    .range(start, start + PAGE_SIZE);
  if (error) {
    console.error("published_articles author read failed", { code: error.code });
  }
  const stories = (data ?? []).slice(0, PAGE_SIZE);
  const hasOlder = (data?.length ?? 0) > PAGE_SIZE && page < MAX_PAGE;
  const authorName = stories[0]?.author_name || slug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const pageHref = (number: number) => `/news/author/${encodeURIComponent(slug)}${number > 1 ? `?page=${number}` : ""}`;
  const now = Date.now();

  return <PageFrame className={`${styles.newsPage} ui-stack`}>
    <header className={styles.pageHeader}>
      <div className={styles.headingCopy}>
        <p className={styles.kicker}>Newsroom byline</p>
        <h1 className={styles.pageTitle}>{authorName}</h1>
        <p className={styles.pageDescription}>Published reporting filed under this byline{stories.length ? ` · ${stories.length} on this page` : ""}.</p>
      </div>
    </header>
    <nav className="ui-back-link" aria-label="Breadcrumb"><Link href="/news">News</Link><span aria-hidden="true"> / </span><span>{authorName}</span></nav>
    {error ? <EmptyPanel
      title="Stories unavailable"
      description="We could not reach the published newsroom, so no stories are shown rather than a guess."
      actions={<Link href="/news" className="btn-secondary">Back to news</Link>}
    /> : !stories.length ? <EmptyPanel
      title="No published stories yet"
      description="When stories from this byline are published in the newsroom, they will be listed here."
      actions={<Link href="/news" className="btn-secondary">Back to news</Link>}
    /> : <section className={styles.storiesSection} aria-labelledby="author-stories-heading">
      <div className={styles.sectionHeading}><h2 id="author-stories-heading">Stories</h2><span>Newest first</span></div>
      <ul className={styles.storyGrid}>{stories.map((article) => {
        const image = publishedNewsCover(article)?.url ?? null;
        return <li key={article.slug}><article className={styles.storyCard}>
          <Link href={newsArticlePath(article.slug)} className={styles.storyMedia} tabIndex={-1} aria-hidden="true">
            <NewsImage className={styles.storyImage} src={image} alt="" />
          </Link>
          <div className={styles.storyCopy}>
            <h3 className={styles.storyTitle}><Link href={newsArticlePath(article.slug)}>{article.title}</Link></h3>
            {article.summary ? <p className={styles.storySummary}>{article.summary}</p> : null}
            <p className={styles.storyMeta}>{article.published_at ? <time dateTime={article.published_at}>{formatPublishedDate(article.published_at)}</time> : null}</p>
          </div>
        </article></li>;
      })}</ul>
    </section>}
    {page > 1 || hasOlder ? <nav className={styles.pagination} aria-label="Author pages">
      {page > 1 ? <Link className="btn-secondary" href={pageHref(page - 1)}>Newer stories</Link> : null}
      <span className={styles.pageNumber} aria-live="polite">Page {page}</span>
      {hasOlder ? <Link className="btn-secondary" href={pageHref(page + 1)}>More stories</Link> : null}
    </nav> : null}
  </PageFrame>;
}
