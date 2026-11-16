import { estimateReadMinutes } from "../lib/news-reading-time";
import type { ArticleEngagement } from "../lib/article-engagement";
import { ClockIcon, EyeIcon, MessageCircleIcon } from "./icons";
import styles from "../app/news/news.module.css";

/**
 * Engagement chips printed on the article cover: estimated read time, real
 * unique daily views and the visible comment count. The read time is derived
 * from the published body text; views and comments come from the aggregate
 * view, and are omitted rather than guessed when it is unavailable.
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
  const readMinutes = estimateReadMinutes(body);
  const label = [
    engagement ? `${engagement.views.toLocaleString("en-NG")} views` : null,
    `${readMinutes} minute read`,
    commentCount !== null ? `${commentCount.toLocaleString("en-NG")} comments` : null,
  ].filter(Boolean).join(",");
  return <div className={styles.coverStats} role="img" aria-label={label}>
    <span className={styles.coverStat}><ClockIcon size={14} /><span>{readMinutes} min read</span></span>
    {engagement ? <span className={styles.coverStat}><EyeIcon size={14} /><span>{engagement.views.toLocaleString("en-NG")} views</span></span> : null}
    {commentCount !== null ? <span className={styles.coverStat}><MessageCircleIcon size={14} /><span>{commentCount.toLocaleString("en-NG")} comments</span></span> : null}
  </div>;
}
