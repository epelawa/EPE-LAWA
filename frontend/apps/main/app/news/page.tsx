import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { formatPublishedDate } from "../../lib/dates";
import { NewspaperIcon } from "../../components/icons";

/**
 * EPE LAWA News — index.
 *
 * Reads the public read model (`published_articles`), so a draft is not merely filtered out of the
 * result: it is not readable by the visitor's role at all.
 *
 * Empty, error and populated are three different screens. A failed query rendered as "no stories
 * yet" would tell the reader the newsroom is silent when in fact we could not reach it.
 */

type ArticleListItem = {
  slug: string;
  title: string;
  summary: string | null;
  published_at: string | null;
  is_breaking: boolean;
  breaking_until: string | null;
  author_name: string;
  category_label: string;
};

export const metadata: Metadata = {
  title: "News",
  description: "Reporting from Epe Division, Lagos State — at home and abroad.",
  alternates: { canonical: "/news" },
};

/**
 * 30 is a page, not a feed. The index is server-rendered with no pagination yet, so it caps what
 * it will render rather than streaming an unbounded list into the HTML. Cursor pagination lands
 * with the "load more" control; a silent `limit` on an index that claims to be complete would be
 * the dishonest alternative.
 */
const PAGE_SIZE = 30;

/** A breaking flag without a future expiry is not breaking. The window is checked, not assumed. */
function isBreakingNow(item: ArticleListItem): boolean {
  if (!item.is_breaking || !item.breaking_until) return false;
  return new Date(item.breaking_until).getTime() > Date.now();
}

export default async function NewsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("published_articles")
    .select(
      "slug,title,summary,published_at,is_breaking,breaking_until,author_name,category_label",
    )
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(PAGE_SIZE);

  if (error) {
    // The driver message can name tables and policies — log the code, render a human sentence.
    console.error("published_articles list read failed", { code: error.code });

    return (
      <div className="ep-container py-12">
        <header className="mb-8">
          <p className="page-header__eyebrow">News</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">EPE LAWA News</h1>
        </header>
        <div className="card p-6">
          <h2 className="text-lg font-bold">The newsroom did not load</h2>
          <p className="mt-2 text-muted-foreground">
            We could not reach the newsroom to fetch today&rsquo;s stories, so nothing is shown
            rather than a guess. Nothing has changed on your side.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Reload the page, or{" "}
            <Link href="/" className="text-primary underline underline-offset-4">
              return to the homepage
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  // The view's column list is the contract; this cast is the JSON boundary, not a validation step.
  const articles = (data ?? []) as ArticleListItem[];

  return (
    <div className="ep-container py-12">
      <header className="mb-10">
        <p className="page-header__eyebrow">News</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">EPE LAWA News</h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
          Reporting from Epe Division, Lagos State — at home and abroad. Every story carries a
          named byline, a publication date and a route back to the newsroom for corrections.
        </p>
      </header>

      {articles.length === 0 ? (
        <div className="card p-8 text-center">
          <NewspaperIcon size={32} className="mx-auto text-muted-foreground" />
          <h2 className="mt-4 text-lg font-bold">No stories published yet</h2>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            The newsroom is being built. When a story is published it appears here with its byline,
            date and category — nothing is shown before it exists.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {articles.map((article) => {
            const date = formatPublishedDate(article.published_at);
            const breaking = isBreakingNow(article);

            return (
              <li key={article.slug} className="card p-5">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {article.category_label}
                  </span>
                  {breaking ? (
                    <span className="inline-flex items-center rounded-full bg-[var(--color-warning-100)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-warning-700)]">
                      Breaking
                    </span>
                  ) : null}
                </div>

                <h2 className="text-lg font-semibold leading-snug">
                  <Link
                    href={`/news/${article.slug}`}
                    className="text-foreground underline-offset-4 hover:text-primary hover:underline"
                  >
                    {article.title}
                  </Link>
                </h2>

                {article.summary ? (
                  <p className="mt-2 leading-relaxed text-muted-foreground">{article.summary}</p>
                ) : null}

                <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">By {article.author_name}</span>
                  {date ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <time dateTime={article.published_at ?? undefined}>{date}</time>
                    </>
                  ) : null}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {articles.length === PAGE_SIZE ? (
        <p className="mt-8 text-sm text-muted-foreground">
          Showing the {PAGE_SIZE} most recent stories. Older stories are not listed on this page
          yet.
        </p>
      ) : null}
    </div>
  );
}
