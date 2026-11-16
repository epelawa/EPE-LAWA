import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "../../../lib/supabase";
import { newsArticlePath, publicNewsArticleUrl } from "../../../lib/news-urls";
import { publicMediaUrl } from "../../../lib/media";
import { readPublishedArticleBody } from "../../../lib/published-article-body";
import { selectedNewsCover } from "../../../lib/news-covers";
import { formatPublishedDate } from "../../../lib/dates";
import { ArticleBody } from "../../../lib/editorial-body";
import { loadArticleEngagement, type ArticleEngagement } from "../../../lib/article-engagement";
import { CommentThread } from "../comment-thread";
import CommentDock from "../../../components/comment-dock";
import ArticleCoverStats from "../../../components/article-cover-stats";
import ArticleViewPing from "../../../components/article-view-ping";
import OfflineArticleDownload from "../../../components/offline-article-download";
import ArticleShareActions from "../../../components/article-share-actions";
import SaveArticleButton from "../../../components/save-article-button";
import { NewspaperIcon } from "../../../components/icons";
import NewsFooter from "../../../components/news-footer";
import LayoutVariation from "../../../components/layout-variation";
import { PageFrame } from "../../../components/design-system";
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
      .select("id,slug,title,summary,published_at,is_breaking,breaking_until,seo_title,seo_description,og_image_key,author_name,author_slug,category_slug,category_label")
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
  const image = selectedNewsCover(article.og_image_key)?.url ?? publicMediaUrl(article.og_image_key);
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
  return <><PageFrame className={`${styles.articlePage} ui-stack`}><div className="ui-empty"><h1>This story did not load</h1><p className="ui-muted">The newsroom could not reach the published story, so no article text is shown rather than a guess. Try again in a moment.</p><Link href="/news" className="btn-secondary">Back to News</Link></div></PageFrame><NewsFooter /></>;
}

export default async function ArticlePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ comments?: string }> }) {
  const [{ slug }, notice] = await Promise.all([params, searchParams]);
  const result = await loadArticle(slug);
  if (result.status === "error") return <ArticleUnavailable />;
  if (result.status !== "found") notFound();

  const article = result.article;
  let body: unknown;
  let related: RelatedArticle[] = [];
  let engagement: ArticleEngagement | null = null;
  let signedIn = false;
  let visibleComments = 0;
  let saved = false;
  try {
    const supabase = await createClient();
    const [bodyResult, relatedResult, sessionResult, commentCountResult, savedResult, engagementResult] = await Promise.all([
      readPublishedArticleBody(supabase, article.id),
      supabase.from("published_articles").select("slug,title,summary,published_at,og_image_key,category_label").eq("category_slug", article.category_slug).neq("slug", article.slug).order("published_at", { ascending: false, nullsFirst: false }).order("slug", { ascending: true }).limit(3),
      supabase.auth.getUser(),
      supabase.from("comments").select("id", { count: "exact", head: true }).eq("article_id", article.id).eq("state", "visible"),
      supabase.from("saved_articles").select("id", { count: "exact", head: true }).eq("article_id", article.id),
      loadArticleEngagement(supabase, article.id),
    ]);
    if (bodyResult.error || !bodyResult.data) {
      console.error("published article body read failed", { code: bodyResult.error?.code ?? "missing_published_version" });
      return <ArticleUnavailable />;
    }
    body = bodyResult.data.body;
    if (relatedResult.error) console.error("related published articles read failed", { code: relatedResult.error.code });
    else related = (relatedResult.data ?? []) as RelatedArticle[];
    engagement = engagementResult;
    signedIn = Boolean(sessionResult.data?.user);
    visibleComments = commentCountResult.count ?? 0;
    saved = Boolean(sessionResult.data?.user) && (savedResult.count ?? 0) > 0;
  } catch {
    console.error("published article body client unavailable", { reason: "configuration_or_provider" });
    return <ArticleUnavailable />;
  }

  const articleUrl = publicNewsArticleUrl(article.slug);
  const cover = selectedNewsCover(article.og_image_key);
  const imageUrl = cover?.url ?? publicMediaUrl(article.og_image_key);
  const date = formatPublishedDate(article.published_at);
  const commentCount = engagement?.comments ?? visibleComments;
  const signInHref = `/login?next=${encodeURIComponent(`/news/${article.slug}#comments`)}`;

  return (
    <>
    <PageFrame className={`${styles.articlePage} ui-stack`}>
      <ArticleViewPing articleId={article.id} />
      <LayoutVariation area="article"><article className={styles.article}>
        <header className={styles.articleHero}>
          <div className={styles.articleHeroTop}>
            <Link href="/news" className={styles.heroControl} aria-label="Back to News">
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/><path d="M9 12h12"/></svg>
              <span className="sr-only">Back to News</span>
            </Link>
            {signedIn ? <SaveArticleButton articleId={article.id} slug={article.slug} saved={saved} className={styles.heroControl} /> : null}
            <ArticleShareActions title={article.title} url={articleUrl} compact showCopyButton={false} className={styles.heroShareActions} shareButtonClassName={styles.heroControl} feedbackClassName={styles.heroShareFeedback} fallbackClassName={styles.shareFallback} />
          </div>
          <div className={styles.articleHeroCopy}>
            <h1>{article.title}</h1>
          </div>
          <div className={styles.articleCoverFrame}>
            {imageUrl ? <img className={`${styles.articleHeroImage} ${cover ? styles.approvedCoverFull : ""}`} src={imageUrl} alt={cover?.alt ?? ""} loading="eager" fetchPriority="high" decoding="async" referrerPolicy="no-referrer" /> : <span className={styles.articleHeroFallback} aria-hidden="true" />}
            <ArticleCoverStats body={body} engagement={engagement} commentCount={commentCount} />
          </div>
        </header>
        {cover ? <p className={styles.coverCredit}>Illustrative image. <Link href="/photo-credits#news-photos">Photo credits</Link></p> : null}

        <div className={styles.articleMetaBar} aria-label="Story details">
          <span className={styles.byline}>{article.author_name}</span>
          {date ? <time dateTime={article.published_at ?? undefined}>{date}</time> : null}
        </div>

        <div className={`ui-prose ${styles.articleBody}`} data-offline-article-body><ArticleBody body={body} /></div>
        <CommentThread articleId={article.id} slug={article.slug} notice={notice.comments} />
        <CommentDock articleId={article.id} slug={article.slug} count={commentCount} signedIn={signedIn} signInHref={signInHref} />
        <details className={styles.articleExtras}><summary>More story options</summary><OfflineArticleDownload article={{ slug: article.slug, title: article.title, summary: article.summary, publishedAt: article.published_at, author: article.author_name, category: article.category_label, sourceUrl: articleUrl }} /></details>
        {related.length ? <section className={styles.relatedSection} aria-labelledby="related-heading"><div className={styles.sectionHeading}><div><h2 id="related-heading">Related stories</h2></div></div><ul className={styles.relatedGrid}>{related.map((item) => { const relatedCover = selectedNewsCover(item.og_image_key); const relatedImage = relatedCover?.url ?? publicMediaUrl(item.og_image_key); return <li className={styles.relatedCard} key={item.slug}><Link href={newsArticlePath(item.slug)} className={styles.relatedLink}>{relatedImage ? <img className={`${styles.relatedImage} ${relatedCover ? styles.approvedCoverThumb : ""}`} src={relatedImage} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" /> : <span className={styles.relatedImageFallback} aria-hidden="true"><NewspaperIcon size={24} /></span>}<span className={styles.relatedCategory}>{item.category_label}</span><span className={styles.relatedTitle}>{item.title}</span></Link></li>; })}</ul></section> : null}
        <p className={styles.correctionNote}>Correction reporting is not available through this site yet. <Link href="/contact" className="ui-text-link">View contact availability</Link>.</p>
      </article></LayoutVariation>
    </PageFrame>
    <NewsFooter />
    </>
  );
}
