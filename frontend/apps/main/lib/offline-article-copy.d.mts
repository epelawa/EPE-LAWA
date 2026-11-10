export type OfflineArticle = {
  slug: string;
  title: string;
  summary: string | null;
  publishedAt: string | null;
  author: string;
  category: string;
  sourceUrl: string;
};

export function offlineArticleFilename(slug: string): string;
export function buildOfflineArticleHtml(article: OfflineArticle, bodyText: string): string;
