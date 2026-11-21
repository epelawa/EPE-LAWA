import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "../../../lib/supabase";
import { newsArticlePath, publicNewsArticleUrl } from "../../../lib/news-urls";
import { absoluteUrl, siteUrl } from "../../../lib/site";
import { publishedNewsCover } from "../../../lib/published-news-cover";
import { readPublishedArticleBody } from "../../../lib/published-article-body";
import { formatPublishedDate } from "../../../lib/dates";
import { ArticleBody } from "../../../lib/editorial-body";
import { loadArticleEngagement, type ArticleEngagement } from "../../../lib/article-engagement";
import { CommentThread } from "../comment-thread";
import CommentDock from "../../../components/comment-dock";
import ArticleCoverStats from "../../../components/article-cover-stats";
import ArticleViewPing from "../../../components/article-view-ping";
import ReaderPresence from "../../../components/reader-presence";
import OfflineArticleDownload from "../../../components/offline-article-download";
import ArticleShareActions from "../../../components/article-share-actions";
import CorrectionForm from "../../../components/correction-form";
import SaveArticleButton from "../../../components/save-article-button";
import NewsImage from "../../../components/news-image";
import ArticleByline from "../../../components/article-byline";
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
  cover_url: string | null;
  cover_alt: string | null;
  cover_credit: string | null;
  cover_caption: string | null;
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
  cover_url: string | null;
  cover_alt: string | null;
  category_label: string;
};
type ArticleResult = { status: "found"; article: PublishedArticle } | { status: "missing" } | { status: "error" };

const loadArticle = cache(async (slug: string): Promise<ArticleResult> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("published_articles")
      .select("id,slug,title,summary,published_at,is_breaking,breaking_until,seo_title,seo_description,cover_url,cover_alt,cover_credit,cover_caption,author_name,author_slug,category_slug,category_label")
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
  const coverImage = publishedNewsCover(article)?.url ?? null;
  const image = coverImage ? new URL(coverImage, siteUrl).toString() : absoluteUrl("/brand-logo.png");
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
      images: [{ url: image, alt: coverImage ? article.title : "EPE LAWA — The Voice of Epe Division" }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

function ArticleUnavailable() {
  return <PageFrame className={`${styles.articlePage} ui-stack`}><div className="ui-empty"><h1>This story did not load</h1><p className="ui-muted">The newsroom could not reach the published story, so no article text is shown rather than a guess. Try again in a moment.</p><Link href="/news" className="btn-secondary">Back to News</Link></div></PageFrame>;
}

export default async function ArticlePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ comments?: string }> }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const [{ slug }, notice] = await Promise.all([params, searchParams]);
  const result = await loadArticle(slug);
  if (result.status === "error") return <ArticleUnavailable />;
  if (result.status !== "found") notFound();

  const article = result.article;
  let body: unknown;
  let related: RelatedArticle[] = [];
  let engagement: ArticleEngagement | null = null;
  let signedIn = false;
  let visibleComments: number | null = null;
  let saved = false;
  try {
    const supabase = await createClient();
    const [bodyResult, relatedResult, sessionResult, commentCountResult, savedResult, engagementResult] = await Promise.all([
      readPublishedArticleBody(supabase, article.id),
      supabase.from("published_articles").select("slug,title,summary,published_at,cover_url,cover_alt,category_label").eq("category_slug", article.category_slug).neq("slug", article.slug).order("published_at", { ascending: false, nullsFirst: false }).order("slug", { ascending: true }).limit(3),
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
    visibleComments = commentCountResult.error ? null : commentCountResult.count;
    saved = Boolean(sessionResult.data?.user) && (savedResult.count ?? 0) > 0;
  } catch {
    console.error("published article body client unavailable", { reason: "configuration_or_provider" });
    return <ArticleUnavailable />;
  }

  const articleUrl = publicNewsArticleUrl(article.slug);
  const publishedCover = publishedNewsCover(article);
  const imageUrl = publishedCover?.url;
  const date = formatPublishedDate(article.published_at);
  const commentCount = engagement?.comments ?? visibleComments;
  const signInHref = `/login?next=${encodeURIComponent(`/news/${article.slug}#comments`)}`;

  return (
    <div className={signedIn ? "member-reading-mode" : undefined}>
    <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{__html:JSON.stringify({"@context":"https://schema.org","@type":"NewsArticle",headline:article.title,description:article.summary || undefined,datePublished:article.published_at || undefined,author:article.author_name ? {"@type":"Person",name:article.author_name} : undefined,publisher:{"@type":"Organization",name:"EPE LAWA",url:siteUrl},mainEntityOfPage:articleUrl,image:imageUrl ? new URL(imageUrl,siteUrl).toString() : undefined}).replace(/</g,"\\u003c")}} />
    {signedIn ? <nav className={styles.memberReadingBar} aria-label="Member reading navigation">
      <Link href="/dashboard?tab=discover" className={styles.memberReadingBack}>← <span>Discover</span></Link>
      <span className={styles.memberReadingLabel}>EPE LAWA <span>· Member reading</span></span>
      <Link href="/dashboard?tab=saved" className={styles.memberReadingSaved}>Saved stories</Link>
    </nav> : null}
    <PageFrame className={`${styles.articlePage} ui-stack ${signedIn ? styles.memberArticlePage : styles.publicArticlePage}`}>
      <ArticleViewPing articleId={article.id} />
      <LayoutVariation area="article"><article className={styles.article}>
        <header className={styles.articleHero}>
          <div className={styles.articleHeroTop}>
            <Link href={signedIn ? "/dashboard?tab=discover" : "/news"} className={styles.heroControl} aria-label={signedIn ? "Back to Discover" : "Back to News"}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/><path d="M9 12h12"/></svg>
              <span className="sr-only">{signedIn ? "Back to Discover" : "Back to News"}</span>
            </Link>
            {signedIn ? <SaveArticleButton articleId={article.id} slug={article.slug} saved={saved} className={styles.heroControl} /> : null}
            <ArticleShareActions title={article.title} imageUrl={imageUrl} url={articleUrl} compact showCopyButton={false} className={styles.heroShareActions} shareButtonClassName={styles.heroControl} feedbackClassName={styles.heroShareFeedback} fallbackClassName={styles.shareFallback} />
          </div>
          <div className={styles.articleHeroCopy}>
            {!signedIn ? <p className={styles.articleCategory}>{article.category_label}</p> : null}
            <h1>{article.title}</h1>
            <ReaderPresence slug={article.slug} />
            {!signedIn && article.summary ? <p className={styles.articleStandfirst}>{article.summary}</p> : null}
            {!signedIn ? <div className={styles.publicStoryMeta}><ArticleByline name={article.author_name} />{date ? <time dateTime={article.published_at ?? undefined}>{date}</time> : null}</div> : null}
          </div>
          <div className={styles.articleCoverFrame}>
            <NewsImage className={styles.articleHeroImage} src={imageUrl} alt={publishedCover?.alt ?? ""} loading="eager" fetchPriority="high" />
            <ArticleCoverStats body={body} engagement={engagement} commentCount={commentCount} />
          </div>
        </header>
        {article.cover_credit && imageUrl ? <p className={styles.coverCredit}>{article.cover_caption ? `${article.cover_caption} · ` : ""}Photo: {article.cover_credit}</p> : null}

        {signedIn ? <div className={styles.articleMetaBar} aria-label="Story details">
          <span className={styles.byline}><ArticleByline name={article.author_name} /></span>
          {date ? <time dateTime={article.published_at ?? undefined}>{date}</time> : null}
        </div> : null}

        <div className={styles.readingGuide}><span>THE STORY</span><a href="#comments">Join the conversation <span aria-hidden="true">↗</span></a></div>
        <div className={`ui-prose ${styles.articleBody}`} data-offline-article-body><ArticleBody body={body} /></div>
        <p className={styles.articleAuthorCredit}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m4 20 4.3-1 10.2-10.2a2.1 2.1 0 0 0-3-3L5.3 16 4 20Z" /><path d="m13.8 7.2 3 3" /><path d="M4 20h4" /></svg><span><strong>Brought to you by</strong> {article.author_name}</span></p>
        <CommentThread articleId={article.id} slug={article.slug} notice={notice.comments} />
        <CommentDock articleId={article.id} slug={article.slug} count={commentCount} signedIn={signedIn} signInHref={signInHref} />
        <nav aria-label="Share this story" className={styles.shareLinks}><a href={`https://wa.me/?text=${encodeURIComponent(`${article.title} ${articleUrl}`)}`} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a><a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`} target="_blank" rel="noopener noreferrer">Share on Facebook</a><a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(articleUrl)}`} target="_blank" rel="noopener noreferrer">Share on X</a><ArticleShareActions title={article.title} url={articleUrl} imageUrl={imageUrl} /></nav>
        <details className={styles.articleExtras}><summary>More story options</summary><OfflineArticleDownload article={{ slug: article.slug, title: article.title, summary: article.summary, publishedAt: article.published_at, author: article.author_name, category: article.category_label, sourceUrl: articleUrl }} /></details>
        {related.length ? <section className={styles.relatedSection} aria-labelledby="related-heading"><div className={styles.sectionHeading}><div><h2 id="related-heading">Related stories</h2></div></div><ul className={styles.relatedGrid}>{related.map((item) => { const relatedImage = publishedNewsCover(item)?.url; return <li className={styles.relatedCard} key={item.slug}><Link href={newsArticlePath(item.slug)} className={styles.relatedLink}><NewsImage className={styles.relatedImage} src={relatedImage} alt="" /><span className={styles.relatedCategory}>{item.category_label}</span><span className={styles.relatedTitle}>{item.title}</span></Link></li>; })}</ul></section> : null}
        {signedIn ? <CorrectionForm articleId={article.id} articleTitle={article.title} /> : <p className={styles.correctionNote}>Spotted an error in this story? <Link href="/contact" className="ui-text-link">Suggest a correction</Link> through the contact desk, or email <a className="ui-text-link" href={`mailto:info.epelawa@gmail.com?subject=${encodeURIComponent(`Correction: ${article.title}`)}`}>info.epelawa@gmail.com</a>.</p>}
      </article></LayoutVariation>
    </PageFrame>
    </div>
  );
}
