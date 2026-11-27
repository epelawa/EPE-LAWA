import { ClockIcon, EyeIcon, MessageCircleIcon } from "./icons";
import styles from "./story-stats.module.css";

export type StoryStatsValues = { readMinutes: number; views: number | null; comments: number | null };
type Labels = { read: string; views: string; comments: string };
const ENGLISH: Labels = { read: "min read", views: "views", comments: "comments" };

/**
 * One aligned row of real story numbers: estimated read time, unique daily
 * views and visible comments. Views or comments that could not be read are
 * left out rather than shown as zero.
 */
export default function StoryStats({ stats, labels = ENGLISH, tone = "light", className = "" }: { stats: StoryStatsValues; labels?: Labels; tone?: "light" | "muted"; className?: string }) {
  const parts = [
    `${stats.readMinutes} ${labels.read}`,
    stats.views !== null ? `${stats.views.toLocaleString("en-NG")} ${labels.views}` : null,
    stats.comments !== null ? `${stats.comments.toLocaleString("en-NG")} ${labels.comments}` : null,
  ].filter(Boolean);
  return (
    <ul className={`${styles.stats} ${tone === "muted" ? styles.muted : ""} ${className}`.trim()} aria-label={parts.join(", ")}>
      <li className={styles.stat} title="Estimated read time"><ClockIcon size={14} className={styles.icon} /><span>{stats.readMinutes} {labels.read}</span></li>
      {stats.views !== null ? <li className={styles.stat} title="Unique daily views"><EyeIcon size={14} className={styles.icon} /><span>{stats.views.toLocaleString("en-NG")} {labels.views}</span></li> : null}
      {stats.comments !== null ? <li className={styles.stat} title="Comments"><MessageCircleIcon size={14} className={styles.icon} /><span>{stats.comments.toLocaleString("en-NG")} {labels.comments}</span></li> : null}
    </ul>
  );
}
