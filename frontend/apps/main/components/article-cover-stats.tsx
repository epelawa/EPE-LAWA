import { estimateReadMinutes } from "../lib/news-reading-time";
import type { ArticleEngagement } from "../lib/article-engagement";
import StoryStats from "./story-stats";

/**
 * The row under the article cover: estimated read time ("N min read", from the
 * published body text), real unique daily views and the visible comment count.
 * Views and comments are omitted rather than guessed when they are unavailable.
 */
export default function ArticleCoverStats({
  body,
  engagement,
  commentCount,
}: {
  body: unknown;
  engagement: ArticleEngagement | null;
  commentCount: number | null;
}) {
  return <StoryStats stats={{ readMinutes: estimateReadMinutes(body), views: engagement ? engagement.views : null, comments: commentCount }} />;
}
