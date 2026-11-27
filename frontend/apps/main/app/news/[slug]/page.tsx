import type { Metadata } from "next";
import Link from "next/link";
import StructuredData from "../../../components/structured-data";
import { breadcrumbSchema, newsArticleSchema } from "../../../lib/structured-data";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "../../../lib/supabase";
import { newsArticlePath, publicNewsArticleUrl } from "../../../lib/news-urls";
import { absoluteUrl, siteUrl } from "../../../lib/site";
import { publishedNewsCover } from "../../../lib/published-news-cover";
import { readPublishedArticleBody } from "../../../lib/published-article-body";
import { formatLagosDateTime, formatPublishedDate } from "../../../lib/dates";
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
import ArticleLikeButton from "../../../components/article-like-button";
import { formAdminClient } from "../../../lib/form-server";
import { CONTACT_EMAIL } from "../../../lib/site-identity";
import { memberVoterKey, readGuestKey } from "../../../lib/guest-identity";
import { PageFrame } from "../../../components/design-system";
import styles from "../news.module.css";
import a from "./article.module.css";

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
  tags: { slug: string; label: string }[] | null;
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
type AiSource = { outlet: string; title?: string; url: string };
type ArticleResult = { status: "found"; article: PublishedArticle } | { status: "missing" } | { status: "error" };

const loadArticle = cache(async (slug: string): Promise<ArticleResult> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("published_articles")
      .select("id,slug,title,summary,published_at,is_breaking,breaking_until,seo_title,seo_description,cover_url,cover_alt,cover_credit,cover_caption,author_name,author_slug,category_slug,category_label,tags")
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
  const image = coverImage ? new URL(coverImage, siteUrl).toString() : absoluteUrl("/brand-logo.webp");
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
  return <PageFrame className={`${styles.articlePage} ${a.page} ui-stack`}><div className="ui-empty"><h1>This story did not load</h1><p className="ui-muted">The newsroom could not reach the published story, so no article text is shown rather than a guess. Try again in a moment.</p><Link href="/news" className="btn-secondary">Back to News</Link></div></PageFrame>;
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
  let userId: string | null = null;
  let accountEmail: string | null = null;
  let visibleComments: number | null = null;
  let saved = false;
  let likes: number | null = null;
  let aiSources: AiSource[] = [];
  try {
    const supabase = await createClient();
    const [bodyResult, relatedResult, sessionResult, commentCountResult, savedResult, engagementResult, likeTotal, aiMeta] = await Promise.all([
      readPublishedArticleBody(supabase, article.id),
      supabase.from("published_articles").select("slug,title,summary,published_at,cover_url,cover_alt,category_label").eq("category_slug", article.category_slug).neq("slug", article.slug).order("published_at", { ascending: false, nullsFirst: false }).order("slug", { ascending: true }).limit(3),
      supabase.auth.getUser(),
      supabase.from("comments").select("id", { count: "exact", head: true }).eq("article_id", article.id).eq("state", "visible"),
      supabase.from("saved_articles").select("id", { count: "exact", head: true }).eq("article_id", article.id),
      loadArticleEngagement(supabase, article.id),
      supabase.rpc("article_like_total", { p_article_id: article.id }),
      supabase.from("ai_article_meta").select("sources").eq("article_id", article.id).maybeSingle(),
    ]);
    if (bodyResult.error || !bodyResult.data) {
      console.error("published article body read failed", { code: bodyResult.error?.code ?? "missing_published_version" });
      return <ArticleUnavailable />;
    }
    body = bodyResult.data.body;
    if (relatedResult.error) console.error("related published articles read failed", { code: relatedResult.error.code });
    else related = (relatedResult.data ?? []) as RelatedArticle[];
    engagement = engagementResult;
    userId = sessionResult.data?.user?.id ?? null;
    signedIn = Boolean(userId);
    accountEmail = sessionResult.data?.user?.email ?? null;
    visibleComments = commentCountResult.error ? null : commentCountResult.count;
    saved = signedIn && (savedResult.count ?? 0) > 0;
    likes = likeTotal.error ? null : Number(likeTotal.data ?? 0);
    const sources = (aiMeta.data as { sources?: unknown } | null)?.sources;
    if (Array.isArray(sources)) aiSources = sources.filter((item): item is AiSource => Boolean(item) && typeof (item as AiSource).url === "string" && /^https:\/\//.test((item as AiSource).url) && typeof (item as AiSource).outlet === "string").slice(0, 8);
  } catch {
    console.error("published article body client unavailable", { reason: "configuration_or_provider" });
    return <ArticleUnavailable />;
  }

  // Whether this reader already liked the story (account for members, browser for guests).
  let liked = false;
  try {
    const voterKey = userId ? memberVoterKey(userId) : await readGuestKey();
    if (voterKey) liked = (await formAdminClient().rpc("article_like_state", { p_article_id: article.id, p_voter_key: voterKey })).data === true;
  } catch { liked = false; }

  const articleUrl = publicNewsArticleUrl(article.slug);
  const publishedCover = publishedNewsCover(article);
  const imageUrl = publishedCover?.url;
  const uploaded = formatLagosDateTime(article.published_at);
  const commentCount = engagement?.comments ?? visibleComments;
  const signInHref = `/login?next=${encodeURIComponent(`/news/${article.slug}#comments`)}`;
  const breaking = article.is_breaking && (!article.breaking_until || Date.parse(article.breaking_until) > Date.now());
  const authorInitials = article.author_name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "E";

  return (
    <>
    <StructuredData
      data={[
        newsArticleSchema({
          slug: article.slug,
          title: article.title,
          summary: article.summary,
          published_at: article.published_at,
          cover_url: imageUrl,
          cover_alt: article.cover_alt,
          author_name: article.author_name,
          author_slug: article.author_slug,
          section: { slug: article.category_slug, label: article.category_label },
          tags: article.tags,
        }),
        breadcrumbSchema([
          { name: "News", path: "/news" },
          ...(article.category_slug
            ? [{ name: article.category_label, path: `/news?category=${encodeURIComponent(article.category_slug)}` }]
            : []),
          { name: article.title, path: newsArticlePath(article.slug) },
        ]),
      ]}
    />
    <PageFrame className={`${styles.articlePage} ${a.page}`}>
      <ArticleViewPing articleId={article.id} />
      <article className={a.article}>
        <nav className={a.topBar} aria-label="Story controls">
          <Link href="/news" className={`${a.iconControl} ${a.backLink}`} aria-label="Back to News">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/><path d="M9 12h12"/></svg>
            <span className="sr-only">Back to News</span>
          </Link>
          <div className={a.topBarEnd}>
            {signedIn ? <SaveArticleButton articleId={article.id} slug={article.slug} saved={saved} className={a.iconControl} /> : null}
            <ArticleShareActions title={article.title} imageUrl={imageUrl} url={articleUrl} compact showCopyButton={false} className={a.shareGroup} shareButtonClassName={a.shareButton} feedbackClassName={a.shareFeedback} fallbackClassName={a.shareFallback} />
          </div>
        </nav>

        <header className={`${a.header} ${a.column}`}>
          <p className={a.kicker}>
            {breaking ? <span className={a.breaking}>Breaking</span> : null}
            {article.category_slug ? <Link className={a.category} href={`/news?category=${encodeURIComponent(article.category_slug)}`}>{article.category_label}</Link> : null}
          </p>
          <h1 className={a.title}>{article.title}</h1>
          {article.summary ? <p className={a.standfirst}>{article.summary}</p> : null}
          <div className={a.meta} aria-label="Story details">
            <span className={a.metaItem}>By {article.author_slug ? <Link href={`/news/author/${encodeURIComponent(article.author_slug)}`}>{article.author_name}</Link> : <strong>{article.author_name}</strong>}</span>
            {uploaded ? <span className={a.metaItem}>Published <time dateTime={article.published_at ?? undefined} title={article.published_at ?? undefined}><strong>{uploaded}</strong></time> <span aria-label="West Africa Time">WAT</span></span> : null}
          </div>
          <ReaderPresence slug={article.slug} />
        </header>

        <figure className={a.cover}>
          <NewsImage className={a.coverImage} src={imageUrl} alt={publishedCover?.alt ?? ""} loading="eager" fetchPriority="high" />
          <ArticleCoverStats body={body} engagement={engagement} commentCount={commentCount} />
          {article.cover_credit && imageUrl ? <figcaption className={a.coverCaption}>{article.cover_caption ? `${article.cover_caption} · ` : ""}Photo: {article.cover_credit}</figcaption> : null}
        </figure>

        <div className={`ui-prose ${a.body} ${a.column}`} data-offline-article-body data-no-translate><ArticleBody body={body} /></div>

        {aiSources.length ? <aside className={`${a.sources} ${a.column}`} aria-labelledby="story-sources">
          <h2 id="story-sources">How this story was produced</h2>
          <p>The {article.author_name} prepared this report with the help of an AI assistant, using only the published reporting below. Figures and quotes are checked against these sources before publication. Spotted a problem? Use “Suggest a correction” below or email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
          <ul>{aiSources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer nofollow">{source.outlet}{source.title ? `: ${source.title}` : ""}</a></li>)}</ul>
        </aside> : null}

        {article.tags?.length ? <nav className={a.column} aria-label="Story topics"><ul className={a.hashtags}>{article.tags.map((tag) => tag.slug ? <li key={tag.slug}><Link className={a.hashtag} href={`/news?tag=${encodeURIComponent(tag.slug)}`}>#{(tag.label ?? tag.slug).replace(/^#/, "").replace(/\s+/g, "")}</Link></li> : null)}</ul></nav> : null}

        <div className={`${a.actions} ${a.column}`} role="group" aria-label="React to this story">
          <div className={a.actionsStart}>
            <ArticleLikeButton articleId={article.id} initialLiked={liked} initialCount={likes} className={a.pill} activeClassName={a.pillActive} />
            <a className={a.pill} href="#comments"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.8 7L3 21l2-6.2A8 8 0 1 1 21 12Z"/></svg><span>{commentCount ? `${commentCount.toLocaleString("en-NG")} comments` : "Comment"}</span></a>
          </div>
          <ArticleShareActions title={article.title} imageUrl={imageUrl} url={articleUrl} showCopyButton={false} className={a.shareGroup} shareButtonClassName={a.pill} feedbackClassName={a.shareFeedback} fallbackClassName={a.shareFallback} />
        </div>

        <p className={`${a.author} ${a.column}`}><span className={a.authorMark} aria-hidden="true">{authorInitials}</span><span><strong>Brought to you by</strong> {article.author_slug ? <Link href={`/news/author/${encodeURIComponent(article.author_slug)}`}>{article.author_name}</Link> : article.author_name}{uploaded ? <> · {uploaded} WAT</> : null}</span></p>

        <div className={a.column}><CommentThread articleId={article.id} slug={article.slug} notice={notice.comments} /></div>
        <CommentDock articleId={article.id} slug={article.slug} count={commentCount} signedIn={signedIn} signInHref={signInHref} />

        {related.length ? <section className={a.related} aria-labelledby="related-heading"><h2 id="related-heading">Related stories</h2><ul className={a.relatedGrid}>{related.map((item) => { const relatedImage = publishedNewsCover(item)?.url; const when = formatPublishedDate(item.published_at); return <li key={item.slug}><Link href={newsArticlePath(item.slug)} className={a.relatedLink}><NewsImage className={a.relatedImage} src={relatedImage} alt="" /><span className={a.relatedCategory}>{item.category_label}</span><span className={a.relatedTitle}>{item.title}</span>{when ? <span className={a.relatedTime}>{when}</span> : null}</Link></li>; })}</ul></section> : null}

        <div className={`${a.extras} ${a.column}`}>
          <CorrectionForm articleId={article.id} articleTitle={article.title} signedIn={signedIn} accountEmail={accountEmail} />
          <details><summary>Save this story for offline reading</summary><OfflineArticleDownload article={{ slug: article.slug, title: article.title, summary: article.summary, publishedAt: article.published_at, author: article.author_name, category: article.category_label, sourceUrl: articleUrl }} /></details>
        </div>
      </article>
    </PageFrame>
    </>
  );
}
