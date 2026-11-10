import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "../../../lib/supabase";
import { absoluteUrl } from "../../../lib/site";
import { publicMediaUrl } from "../../../lib/media";
import { formatPublishedDate } from "../../../lib/dates";
import { ArticleBody } from "../../../lib/editorial-body";
import { CommentThread } from "../comment-thread";
import OfflineArticleDownload from "../../../components/offline-article-download";
import { PageFrame, StatusBadge } from "../../../components/design-system";

type PublishedArticle = { id: string; slug: string; title: string; summary: string | null; body: unknown; published_at: string | null; is_breaking: boolean; breaking_until: string | null; seo_title: string | null; seo_description: string | null; og_image_key: string | null; author_name: string; author_slug: string; category_slug: string; category_label: string; tags: { slug: string; label: string }[] | null };
type ArticleResult = { status: "found"; article: PublishedArticle } | { status: "missing" } | { status: "error" };
const loadArticle = cache(async (slug: string): Promise<ArticleResult> => { try { const supabase = await createClient(); const { data, error } = await supabase.from("published_articles").select("id,slug,title,summary,body,published_at,is_breaking,breaking_until,seo_title,seo_description,og_image_key,author_name,author_slug,category_slug,category_label,tags").eq("slug", slug).maybeSingle(); if (error) { console.error("published_articles read failed", { code: error.code }); return { status: "error" }; } if (!data) return { status: "missing" }; return { status: "found", article: data as PublishedArticle }; } catch { console.error("published_articles article client unavailable", { reason: "configuration_or_provider" }); return { status: "error" }; } });
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; const result = await loadArticle(slug); if (result.status !== "found") return { title: "Article not found", robots: { index: false, follow: false } }; const article = result.article; const title = article.seo_title || article.title; const description = article.seo_description || article.summary || undefined; const image = publicMediaUrl(article.og_image_key); return { title, description, alternates: { canonical: `/news/${article.slug}` }, openGraph: { type: "article", title, description, url: `/news/${article.slug}`, publishedTime: article.published_at ?? undefined, images: image ? [{ url: image, alt: article.title }] : undefined }, twitter: { card: image ? "summary_large_image" : "summary", title, description, images: image ? [image] : undefined } }; }
export default async function ArticlePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ comments?: string }> }) {
  const [{ slug }, notice] = await Promise.all([params, searchParams]); const result = await loadArticle(slug);
  if (result.status === "error") return <PageFrame className="ui-stack"><Link href="/news" className="ui-back-link">Back to the news index</Link><div className="ui-empty"><h1>This story did not load</h1><p className="ui-muted">The newsroom could not be reached, so nothing is shown rather than a guess at the article. Try again in a moment.</p></div></PageFrame>;
  if (result.status !== "found") notFound();
  const article = result.article; const articleUrl = absoluteUrl(`/news/${article.slug}`); const imageUrl = publicMediaUrl(article.og_image_key); const date = formatPublishedDate(article.published_at); const breakingNow = article.is_breaking && article.breaking_until !== null && new Date(article.breaking_until).getTime() > Date.now(); const shareText = `${article.title}\n\n${articleUrl}`;
  return <PageFrame className="ui-stack">
    <article className="ui-stack"><nav aria-label="Breadcrumb" className="ui-meta"><Link href="/news" className="ui-back-link">Newsroom</Link><span aria-hidden="true">/</span><span>{article.category_label}</span></nav>
      <header className="ui-stack-sm"><div className="ui-row"><StatusBadge>{article.category_label}</StatusBadge>{breakingNow ? <StatusBadge tone="warning">Breaking</StatusBadge> : null}</div><h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-tight">{article.title}</h1><div className="ui-meta"><span className="font-medium text-foreground">By {article.author_name}</span>{date ? <><span aria-hidden="true">·</span><time dateTime={article.published_at ?? undefined}>{date}</time></> : null}</div></header>
      <OfflineArticleDownload article={{ slug: article.slug, title: article.title, summary: article.summary, publishedAt: article.published_at, author: article.author_name, category: article.category_label, sourceUrl: articleUrl }} />
      {imageUrl ? <figure className="ui-cover overflow-hidden rounded-2xl border"><img src={imageUrl} alt={article.title} className="h-full w-full object-cover" loading="eager" decoding="async"/></figure> : null}
      {article.summary ? <p className="ui-subtle rounded-xl border-l-2 p-5 text-lg font-medium leading-relaxed">{article.summary}</p> : null}
      <div className="ui-prose" data-offline-article-body><ArticleBody body={article.body}/></div>
      {article.tags && article.tags.length > 0 ? <ul className="ui-row" aria-label="Tags">{article.tags.map(tag => <li key={tag.slug} className="ui-tag">{tag.label}</li>)}</ul> : null}
      <CommentThread articleId={article.id} slug={article.slug} notice={notice.comments}/>
      <section className="ui-stack-sm ui-divider pt-7" aria-labelledby="share-heading"><div><p className="ui-eyebrow">Pass it along</p><h2 id="share-heading">Share this story</h2></div><ul className="ui-actions"><li><a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">Share on WhatsApp<span className="sr-only"> (opens in a new tab)</span></a></li><li><a href={`https://x.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(articleUrl)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">Share on X<span className="sr-only"> (opens in a new tab)</span></a></li><li><a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">Share on Facebook<span className="sr-only"> (opens in a new tab)</span></a></li></ul></section>
      <p className="ui-divider pt-6 ui-muted">Something in this story wrong or missing? <Link href="/contact" className="ui-text-link">Tell the newsroom</Link>.</p>
    </article>
  </PageFrame>;
}
