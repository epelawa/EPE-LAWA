import { absoluteUrl } from "./site";
import { CONTACT_EMAIL } from "./site-identity";

/**
 * JSON-LD builders for Google readiness. Everything here is derived from
 * records that already exist (published articles, real site identity) — never
 * invented metrics, ratings or review counts.
 */

/** Escape for safe embedding inside an inline <script> tag. */
export function jsonLdScript(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/-->/g, "--\\u003e");
}

export function websiteSchema(): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "EPE LAWA",
    alternateName: "The Voice of Epe Division",
    url: absoluteUrl("/"),
    inLanguage: ["en", "yo"],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl("/search")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function organizationSchema(): object {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "EPE LAWA",
    url: absoluteUrl("/"),
    logo: absoluteUrl("/brand-logo.png"),
    email: CONTACT_EMAIL,
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export type NewsArticleSchemaInput = {
  slug: string;
  title: string;
  summary: string | null;
  published_at: string | null;
  cover_url?: string | null;
  cover_alt: string | null;
  author_name: string;
  author_slug: string;
  section: { slug: string; label: string };
  tags: { slug: string; label: string }[] | null;
};

export function newsArticleSchema(article: NewsArticleSchemaInput): object {
  const datePublished = article.published_at ?? undefined;
  const image = article.cover_url?.startsWith("/")
    ? absoluteUrl(article.cover_url)
    : article.cover_url ?? undefined;
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title.slice(0, 110),
    ...(article.summary ? { description: article.summary } : {}),
    ...(image ? { image: [image] } : {}),
    ...(datePublished ? { datePublished, dateModified: datePublished } : {}),
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(`/news/${encodeURIComponent(article.slug)}`) },
    author: { "@type": "Person", name: article.author_name, url: absoluteUrl(`/news/author/${article.author_slug}`) },
    publisher: {
      "@type": "Organization",
      name: "EPE LAWA",
      logo: { "@type": "ImageObject", url: absoluteUrl("/brand-logo.png") },
    },
    ...(article.section.slug ? { articleSection: article.section.label } : {}),
    ...(article.tags?.length ? { keywords: article.tags.map(tag => tag.label).join(", ") } : {}),
    ...(article.section.slug ? { isPartOf: { "@type": "CollectionPage", name: article.section.label, url: absoluteUrl(`/news?category=${encodeURIComponent(article.section.slug)}`) } } : {}),
  };
}
