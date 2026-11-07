import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "../../../lib/supabase";
import { absoluteUrl } from "../../../lib/site";
import { publicMediaUrl } from "../../../lib/media";
import { formatPublishedDate } from "../../../lib/dates";
import { ArticleBody } from "../../../lib/editorial-body";

/**
 * EPE LAWA News — article page.
 *
 * Reads the public read model (`published_articles`), not the base tables. That view is
 * security_invoker, so RLS decides which rows and columns are visible; a draft cannot leak here
 * even if the query were wrong.
 *
 * There is no comment section, no newsletter form and no byline the database did not supply.
 * Comments are phase 4 and unbuilt; a form that posts nowhere and quotes attributed to real people
 * are not placeholders, they are false statements. The empty space is the honest state.
 */

type PublishedArticle = {
  slug: string;
  title: string;
  summary: string | null;
  body: unknown;
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

type ArticleResult =
  | { status: "found"; article: PublishedArticle }
  | { status: "missing" }
  | { status: "error" };

/**
 * `cache` dedupes the read between generateMetadata and the page render in the same request.
 * It is not a shared cache: a corrected article is visible on the next request.
 */
const loadArticle = cache(async (slug: string): Promise<ArticleResult> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("published_articles")
    .select(
      "slug,title,summary,body,published_at,is_breaking,breaking_until,seo_title,seo_description,og_image_key,author_name,author_slug,category_slug,category_label,tags",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    // Never render the driver message: it can name tables and policies.
    console.error("published_articles read failed", { code: error.code });
    return { status: "error" };
  }
  if (!data) return { status: "missing" };

  // The view's column list is the contract; the cast is the boundary between JSON and this page.
  return { status: "found", article: data as PublishedArticle };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadArticle(slug);

  if (result.status !== "found") {
    // A missing or unreadable article must not be indexed under a generic title.
    return { title: "Article not found", robots: { index: false, follow: false } };
  }

  const article = result.article;
  const title = article.seo_title || article.title;
  const description = article.seo_description || article.summary || undefined;
  const image = publicMediaUrl(article.og_image_key);

  return {
    title,
    description,
    alternates: { canonical: `/news/${article.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/news/${article.slug}`,
      publishedTime: article.published_at ?? undefined,
      images: image ? [{ url: image, alt: article.title }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await loadArticle(slug);

  if (result.status === "error") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="mb-4 text-2xl font-bold tracking-tight">This story did not load</h1>
        <p className="mb-6 leading-relaxed text-muted-foreground">
          The newsroom could not be reached, so nothing is shown rather than a guess at the
          article. Try again in a moment.
        </p>
        <Link href="/news" className="btn-ghost">
          Back to the news index
        </Link>
      </div>
    );
  }

  if (result.status !== "found") notFound();

  const article = result.article;
  const articleUrl = absoluteUrl(`/news/${article.slug}`);
  const imageUrl = publicMediaUrl(article.og_image_key);
  const date = formatPublishedDate(article.published_at);
  const breakingNow =
    article.is_breaking &&
    article.breaking_until !== null &&
    new Date(article.breaking_until).getTime() > Date.now();

  const shareText = `${article.title}\n\n${articleUrl}`;

  return (
    <article className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <nav aria-label="Breadcrumb" className="mb-8 text-sm">
          <Link href="/news" className="text-primary underline underline-offset-4">
            News
          </Link>
        </nav>

        <header className="mb-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-primary">
              {article.category_label}
            </span>
            {breakingNow ? (
              <span className="inline-flex items-center rounded-full bg-[var(--color-warning-100)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-warning-700)]">
                Breaking
              </span>
            ) : null}
          </div>

          <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">By {article.author_name}</span>
            {date ? (
              <>
                <span aria-hidden="true">·</span>
                <time dateTime={article.published_at ?? undefined}>{date}</time>
              </>
            ) : null}
          </div>
        </header>

        {imageUrl ? (
          <figure className="mb-8">
            {/* The stored key is the only image metadata available on this view; the headline is
                the most accurate description we can give a screen reader until media alt text is
                joined into the read model. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={article.title}
              className="w-full rounded-md border object-cover"
              loading="eager"
              decoding="async"
            />
          </figure>
        ) : null}

        {article.summary ? (
          <p className="mb-8 border-l-2 border-[var(--color-gold-500)] pl-4 text-lg font-medium leading-relaxed text-muted-foreground">
            {article.summary}
          </p>
        ) : null}

        <ArticleBody body={article.body} />

        {article.tags && article.tags.length > 0 ? (
          <ul className="mt-10 flex flex-wrap gap-2" aria-label="Tags">
            {article.tags.map((tag) => (
              <li
                key={tag.slug}
                className="rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground"
              >
                {tag.label}
              </li>
            ))}
          </ul>
        ) : null}

        <section className="mt-12 border-t pt-8" aria-labelledby="share-heading">
          <h2
            id="share-heading"
            className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Share this story
          </h2>
          <ul className="flex flex-wrap items-center gap-3">
            <li>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
              >
                Share on WhatsApp
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
            <li>
              <a
                href={`https://x.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(articleUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
              >
                Share on X
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
            <li>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
              >
                Share on Facebook
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          </ul>
        </section>

        <p className="mt-12 border-t pt-8 text-sm text-muted-foreground">
          Something in this story wrong or missing?{" "}
          <Link href="/contact" className="text-primary underline underline-offset-4">
            Tell the newsroom
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
