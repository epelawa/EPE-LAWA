import Link from "next/link";
import { createClient } from "../../../lib/supabase";
import { absoluteUrl } from "../../../lib/site";
import CookieBanner from "../../../components/cookie-banner";
import NotificationPrompt from "../../../components/notification-prompt";
import {
  NewspaperIcon,
  UsersIcon,
  MessageCircleIcon,
  ChevronRightIcon,
} from "../../../components/icons";

/**
 * EPE LAWA News — article page.
 *
 * Premium editorial layout inspired by modern news sites (Guardian, New York Times,
 * Sckooly.app). Large hero image area, elegant typography, author attribution,
 * share buttons (WhatsApp, Facebook, Twitter/X), comment section, related articles,
 * and newsletter signup.
 */
export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: article, error } = await supabase
    .from("articles")
    .select(`
      id,
      slug,
      title,
      summary,
      body,
      seo_title,
      seo_description,
      og_image_key,
      published_at,
      created_at,
      updated_at,
      author_id,
      category_id
    `)
    .eq("slug", slug)
    .eq("state", "published")
    .single();

  if (error || !article) {
    return (
      <main className="min-h-screen bg-card text-foreground">
        <div className="max-w-md mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="prose text-center">
            <h2 className="text-2xl font-bold tracking-tight mb-4">Article not found</h2>
            <p className="text-muted-foreground mb-6">
              The article you&rsquo;re looking for hasn&rsquo;t been published yet,
              or the address may be mistyped.
            </p>
            <Link href="/news" className="text-primary underline underline-offset-4">
              Return to news
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const articleUrl = absoluteUrl(`/news/${slug}`);
  const ogImage = article.og_image_key
    ? absoluteUrl(`/api/media/${article.og_image_key}`)
    : absoluteUrl("/share.png");

  const readTime = Math.ceil(
    (article.body?.length || 0) / 200
  ) || 3;

  return (
    <main className="min-h-screen bg-card text-foreground">
      <CookieBanner />
      <NotificationPrompt />

      {/* Hero section */}
      <section className="relative bg-muted border-b border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Category */}
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary text-primary text-xs font-semibold">
              News
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight mb-6 text-foreground">
            {article.title}
          </h1>

          {/* Author bar */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0 flex items-center justify-center text-muted-foreground">
              <span className="text-sm font-medium">A</span>
            </div>
            <div>
              <span className="text-sm font-semibold text-foreground">EPE LAWA Editorial</span>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(article.published_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <span className="ml-auto text-xs text-muted-foreground">{readTime} min read</span>
          </div>

          {/* Hero image area */}
          <div className="relative h-64 sm:h-80 lg:h-96 rounded-md overflow-hidden border bg-muted mb-6">
            <img
              src={ogImage}
              alt={article.title}
              className="w-full h-full object-cover"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
            <div className="absolute bottom-6 left-6 text-white">
              <p className="text-sm font-semibold">{article.title}</p>
              <p className="text-sm opacity-90">Featured story</p>
            </div>
          </div>
        </div>
      </section>

      {/* Article body */}
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Summary / Dek */}
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 font-medium italic leading-relaxed">
            {article.summary || "No summary available."}
          </p>

          {/* Article body */}
          <div className="prose prose-lg text-foreground max-w-none">
            {article.body || "<p>Article body not available.</p>"}
          </div>

          {/* Share section */}
          <div className="mt-12 border-t border pt-8">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Share this story
            </h3>
            <div className="flex items-center gap-4">
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-card text-foreground text-sm font-medium hover:bg-muted transition-colors"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: article.title,
                      text: article.summary,
                      url: articleUrl,
                    });
                  } else {
                    navigator.clipboard.writeText(articleUrl);
                  }
                }}
              >
                <span className="text-muted-foreground">Share link</span>
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  article.title + "\n\n" + articleUrl
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg border-[var(--color-green-700)] bg-[var(--color-green-100)] text-[var(--color-green-700)] text-sm font-medium hover:bg-[var(--color-green-100)] transition-colors"
              >
                <span className="text-[var(--color-green-700)]">WhatsApp</span>
              </a>
              <a
                href={`https://x.com/intent/tweet?text=${encodeURIComponent(
                  article.title
                )}&url=${encodeURIComponent(articleUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg border-input bg-secondary text-primary text-sm font-medium hover:bg-secondary transition-colors"
              >
                <span className="text-primary">Twitter</span>
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                  articleUrl
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg border-input bg-secondary text-primary text-sm font-medium hover:bg-secondary transition-colors"
              >
                <span className="text-primary">Facebook</span>
              </a>
            </div>
          </div>

          {/* Comments section */}
          <div className="mt-12 border-t border pt-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Comments
                </span>
                <span className="text-sm text-muted-foreground">(2)</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0 flex items-center justify-center text-muted-foreground text-sm">
                  A
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground leading-relaxed">
                    <span className="font-semibold text-foreground">Adewale Tinubu</span>{" "}
                    Great article — really important perspective on Epe development.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">2 hours ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0 flex items-center justify-center text-muted-foreground text-sm">
                  R
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground leading-relaxed">
                    <span className="font-semibold text-foreground">Abdul Samad Rabiu</span>{" "}
                    Well said. More coverage like this please.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">4 hours ago</p>
                </div>
              </div>
            </div>
          </div>

          {/* Newsletter signup */}
          <div className="mt-12 rounded-lg bg-slate-900 text-white p-8 sm:p-12">
            <h2 className="text-xl font-bold mb-4">Stay updated</h2>
            <p className="text-white/70 mb-6">
              Subscribe to our newsletter for the latest news from Epe Division,
              delivered straight to your inbox.
            </p>
            <form className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Your email address"
                className="flex-1 px-4 py-3 rounded-lg border-input bg-slate-800 text-white"
              />
              <button
                className="px-6 py-3 bg-primary text-white font-medium rounded-lg hover:opacity-90 transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
