"use client";

import Link from "next/link";
import { staffHref } from "../lib/admin-path";
import { useLiveQueueCounts, type QueueCounts } from "./use-live-queue-counts";

const labels: { key: keyof QueueCounts; label: string; href: string }[] = [
  { key: "submissions", label: "Directory submissions", href: "/business-review" },
  { key: "corrections", label: "Corrections", href: "/people" },
  { key: "enquiries", label: "Enquiries", href: "/enquiries" },
  { key: "appeals", label: "Appeals", href: "/appeals" },
  { key: "forumReports", label: "Forum reports", href: "/moderation/forum" },
];

export default function QueueLiveCounts() {
  const { counts, flick } = useLiveQueueCounts();
  if (!counts) return null;
  const visible = labels.filter(({ key }) => typeof counts[key] === "number" && (counts[key] as number) > 0);
  if (visible.length === 0) return null;
  return <div className="queue-strip" role="status" aria-live="polite" aria-label="Live queue counts">
    <p className="queue-strip__label">Waiting on you</p>
    <ul>
      {visible.map(({ key, label, href }) => (
        <li key={key} className={flick === key ? "queue-chip queue-chip--hot" : "queue-chip"}>
          <Link href={staffHref(href)}>
            <span>{label}</span>
            <span className="queue-chip__count">{counts[key]}</span>
          </Link>
        </li>
      ))}
    </ul>
  </div>;
}
