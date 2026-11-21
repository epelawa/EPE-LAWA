"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./sponsor-slot.module.css";

export type MiniAd = {
  name: string;
  slug: string;
  categoryLabel: string;
  area: string | null;
  logoUrl: string | null;
};

export default function SponsorMiniCarousel({ items, footer = false, compact = false }: { items: MiniAd[]; footer?: boolean; compact?: boolean }) {
  const [active, setActive] = useState(0);
  const count = items.length;

  useEffect(() => {
    if (count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive((previous) => (previous + 1) % count), 6000);
    return () => window.clearInterval(timer);
  }, [count]);

  const item = items[Math.min(active, count - 1)];
  const slots = `${active + 1} of ${count}`;

  return (
    <aside className={`${styles.slot} ${compact ? styles.compact : ""} ${footer ? styles.footerSlot : ""}`} aria-label="Businesses in our community">
      <Link className={styles.link} href={`/business-directory/${encodeURIComponent(item.slug)}`}>
        <span className={styles.label}>Businesses in our community · {slots}</span>
        <span className={styles.row}>
          {item.logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img className={styles.logoImg} src={item.logoUrl} alt={`${item.name} logo`} width={56} height={56} loading="lazy" decoding="async" />
          ) : (
            <span className={styles.logoLetter} aria-hidden="true">{item.name.slice(0, 1)}</span>
          )}
          <span className={styles.rowCopy}>
            <span className={styles.name}>{item.name}</span>
            <span className={styles.meta}>
              {[item.categoryLabel, item.area].filter(Boolean).join(" · ") || "Local business"}
            </span>
          </span>
        </span>
        <span className={styles.action}>
          View this business <ArrowIcon direction="up-right" />
        </span>
      </Link>
    </aside>
  );
}

function ArrowIcon({ direction }: { direction: "up-right" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {direction === "up-right" ? <path d="M7 17 17 7M8 7h9v9" /> : <path d="M5 12h14M13 6l6 6-6 6" />}
    </svg>
  );
}
