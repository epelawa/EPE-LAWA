import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "../../../lib/supabase";
import { newsArticlePath, publicNewsArticleUrl } from "../../../lib/news-urls";
import { publicMediaUrl } from "../../../lib/media";
import { formatPublishedDate } from "../../../lib/dates";
import { estimateReadMinutes } from "../../../lib/news-reading-time";
import { ArticleBody } from "../../../lib/editorial-body";
import { CommentThread } from "../comment-thread";
import OfflineArticleDownload from "../../../components/offline-article-download";
import ArticleShareActions from "../../../components/article-share-actions";
import { NewspaperIcon } from "../../../components/icons";
import { PageFrame, StatusBadge } from "../../../components/design-system";
import styles from "../news.module.css";

type PublishedArticle = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  published_at: string | null;
  is_breaking: boolean;
  breaking_until: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image_key: string | null;
  author_name: string;
  author_slug: string;
  category_slug: string;
  category_label: string;
  tags: { slug: string; label: string }[] | null;
};
type RelatedArticle = {
  slug: string;
  title: string;
  summary: string | null;
  published_at: string | null;
  og_image_key: string | null;
  category_label: string;
};
type ArticleResult = { status: "found"; article: PublishedArticle } | { status: "missing" } | { status: "error" };

const loadArticle = cache(async (slug: string): Promise<ArticleResult> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("published_articles")
      .select("id,slug,title,summary,published_at,is_breaking,breaking_until,seo_title,seo_description,og_image_key,author_name,author_slug,category_slug,category_label,tags")
      .eq("slug", slug)
      .maybeSingle();
    if (error) {
      console.error("published_articles read failed", { code: error.code });
      return { status: "error" };
    }
    if (!data) return { status: "missing" };
    return { status: "found", article: data as PublishedArticle };
  } catch {
    console.error("published_articles article client unavailable", { reason: "configuration_or_provider" });
    return { status: "error" };
  }
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadArticle(slug);
  if (result.status !== "found") return { title: "Article not found", robots: { index: false, follow: false } };
  const article = result.article;
  const title = article.seo_title || article.title;
  const description = article.seo_description || article.summary || undefined;
  const image = publicMediaUrl(article.og_image_key);
  const articleUrl = publicNewsArticleUrl(article.slug);
  return {
    title,
    description,
    alternates: { canonical: articleUrl },
    openGraph: {
      type: "article",
      title,
      description,
      url: articleUrl,
      publishedTime: article.published_at ?? undefined,
      images: image ? [{ url: image, alt: article.title }] : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, images: image ? [image] : undefined },
  };
}

function ArticleUnavailable() {
  return <PageFrame className={`${styles.articlePage} ui-stack`}><div className="ui-empty"><h1>This story did not load</h1><p className="ui-muted">The newsroom could not reach the published story, so no article text is shown rather than a guess. Try again in a moment.</p><Link href="/news" className="btn-secondary">Back to News</Link></div></PageFrame>;
}

export default async function ArticlePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ comments?: string }> }) {
  const [{ slug }, notice] = await Promise.all([params, searchParams]);
  const result = await loadArticle(slug);
  if (result.status === "error") return <ArticleUnavailable />;
  if (result.status !== "found") notFound();

  const article = result.article;
  let body: unknown;
  let related: RelatedArticle[] = [];
  try {
    const supabase = await createClient();
    const [bodyResult, relatedResult] = await Promise.all([
      // RLS exposes only a version whose id is the article's current published_version_id.
      supabase.from("article_versions").select("body").eq("article_id", article.id).limit(1).maybeSingle(),
      supabase.from("published_articles").select("slug,title,summary,published_at,og_image_key,category_label").eq("category_slug", article.category_slug).neq("slug", article.slug).order("published_at", { ascending: false, nullsFirst: false }).order("slug", { ascending: true }).limit(3),
    ]);
    if (bodyResult.error || !bodyResult.data) {
      console.error("published article body read failed", { code: bodyResult.error?.code ?? "missing_published_version" });
      return <ArticleUnavailable />;
    }
    body = bodyResult.data.body;
    if (relatedResult.error) console.error("related published articles read failed", { code: relatedResult.error.code });
    else related = (relatedResult.data ?? []) as RelatedArticle[];
  } catch {
    console.error("published article body client unavailable", { reason: "configuration_or_provider" });
    return <ArticleUnavailable />;
  }

  const articleUrl = publicNewsArticleUrl(article.slug);
  const imageUrl = publicMediaUrl(article.og_image_key);
  const date = formatPublishedDate(article.published_at);
  const readMinutes = estimateReadMinutes(body);
  const breakingNow = article.is_breaking && article.breaking_until !== null && new Date(article.breaking_until).getTime() > Date.now();
  const shareText = `${article.title}\n\n${articleUrl}`;

  return (
    <PageFrame className={`${styles.articlePage} ui-stack`}>
      <article className={styles.article}>
        <header className={styles.articleHero}>
          {imageUrl ? <img className={styles.articleHeroImage} src={imageUrl} alt="" loading="eager" decoding="async" /> : <span className={styles.articleHeroFallback} aria-hidden="true" />}
          <span className={styles.articleHeroScrim} aria-hidden="true" />
          <div className={styles.articleHeroTop}>
            <Link href="/news" className={styles.heroControl} aria-label="Back to News">
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/><path d="M9 12h12"/></svg>
              <span>News</span>
            </Link>
            <ArticleShareActions title={article.title} url={articleUrl} className={styles.heroShareActions} shareButtonClassName={styles.heroControl} copyButtonClassName={styles.heroControl} feedbackClassName={styles.heroShareFeedback} fallbackClassName={styles.shareFallback} />
          </div>
          <div className={styles.articleHeroCopy}>
            <div className={styles.featureBadges}><span className={styles.featureCategory}>{article.category_label}</span>{breakingNow ? <StatusBadge tone="warning">Breaking</StatusBadge> : null}</div>
            <h1>{article.title}</h1>
          </div>
        </header>

        <div className={styles.articleMetaBar} aria-label="Story details">
          <span className={styles.byline}>By {article.author_name}</span>
          {date ? <time dateTime={article.published_at ?? undefined}>{date}</time> : null}
          <span className={styles.readTime}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>{readMinutes} min read</span>
          <span className={styles.metaNote}>Published story</span>
        </div>

        <div className={styles.articleUtilities}><OfflineArticleDownload article={{ slug: article.slug, title: article.title, summary: article.summary, publishedAt: article.published_at, author: article.author_name, category: article.category_label, sourceUrl: articleUrl }} /></div>
        {article.summary ? <p className={styles.articleSummary}>{article.summary}</p> : null}
        <div className={`ui-prose ${styles.articleBody}`} data-offline-article-body><ArticleBody body={body} /></div>
        {article.tags?.length ? <ul className={styles.articleTags} aria-label="Story tags">{article.tags.map((tag) => <li key={tag.slug} className="ui-tag">{tag.label}</li>)}</ul> : null}

        {related.length ? <section className={styles.relatedSection} aria-labelledby="related-heading"><div className={styles.sectionHeading}><div><p className={styles.kicker}>Keep reading</p><h2 id="related-heading">Related stories</h2></div></div><ul className={styles.relatedGrid}>{related.map((item) => { const relatedImage = publicMediaUrl(item.og_image_key); return <li className={styles.relatedCard} key={item.slug}><Link href={newsArticlePath(item.slug)} className={styles.relatedLink}>{relatedImage ? <img className={styles.relatedImage} src={relatedImage} alt="" loading="lazy" decoding="async" /> : <span className={styles.relatedImageFallback} aria-hidden="true"><NewspaperIcon size={24} /></span>}<span className={styles.relatedCategory}>{item.category_label}</span><span className={styles.relatedTitle}>{item.title}</span></Link></li>; })}</ul></section> : null}

        <CommentThread articleId={article.id} slug={article.slug} notice={notice.comments} />
        <section className={styles.shareSection} aria-labelledby="share-heading">
          <div><p className={styles.kicker}>Pass it along</p><h2 id="share-heading">Share this story</h2><p className={styles.articleSummarySmall}>Share the public article address. It opens directly at this story and does not expose a database record URL.</p></div>
          <ArticleShareActions title={article.title} url={articleUrl} className={styles.bottomShareActions} shareButtonClassName={styles.bottomShareButton} copyButtonClassName={styles.bottomShareButton} feedbackClassName={styles.shareFeedback} fallbackClassName={styles.shareFallback} />
          <ul className={styles.socialLinks}>
            <li><a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">Share on WhatsApp<span className="sr-only"> (opens in a new tab)</span></a></li>
            <li><a href={`https://x.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(articleUrl)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">Share on X<span className="sr-only"> (opens in a new tab)</span></a></li>
            <li><a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">Share on Facebook<span className="sr-only"> (opens in a new tab)</span></a></li>
          </ul>
        </section>
        <p className={styles.correctionNote}>Something in this story wrong or missing? <Link href="/contact" className="ui-text-link">Tell the newsroom</Link>.</p>
      </article>
    </PageFrame>
  );
}
