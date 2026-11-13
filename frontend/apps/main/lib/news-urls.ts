import { absoluteUrl } from "./site";

/** Public article route; never include a database identifier in a shared URL. */
export function newsArticlePath(slug: string): string {
  return `/news/${encodeURIComponent(slug)}`;
}

/** Canonical absolute URL for the public article route. */
export function publicNewsArticleUrl(slug: string): string {
  return absoluteUrl(newsArticlePath(slug));
}
