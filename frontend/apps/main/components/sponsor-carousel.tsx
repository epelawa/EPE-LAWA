"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./sponsor-slot.module.css";
import SponsorLogo from "./sponsor-logo";

export type SponsorCard = {
  name: string;
  slug: string;
  category: string | null;
  area: string | null;
  logoUrl: string | null;
  description: string | null;
};

const INTERVAL_MS = 5000;

export default function SponsorCarousel({
  sponsors,
  compact = false,
  radio = false,
}: {
  sponsors: SponsorCard[];
  compact?: boolean;
  /** /radio variant: shows the description and the "Explore business" action, same as the single card. */
  radio?: boolean;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);
  const count = sponsors.length;

  const go = useCallback(
    (next: number) => {
      if (count > 0) setActive(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive((previous) => (previous + 1) % count), INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  return (
    <div
      className={styles.carousel}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        touchStart.current = null;
        if (start === null) return;
        const delta = event.changedTouches[0].clientX - start;
        if (Math.abs(delta) > 44) go(active + (delta < 0 ? 1 : -1));
      }}
      aria-roledescription="carousel"
      aria-label="Sponsored local businesses"
    >
      <div className={`${styles.carouselWindow} ${compact ? styles.compactWindow : ""}`}>
        <div className={styles.carouselTrack} style={{ transform: `translateX(-${active * 100}%)` }}>
          {sponsors.map((sponsor, index) => (
            <div className={styles.carouselSlide} key={sponsor.slug} hidden={index !== active} aria-hidden={index !== active}>
              <Link
                className={styles.link}
                href={`/business-directory/${encodeURIComponent(sponsor.slug)}`}
                tabIndex={index === active ? 0 : -1}
              >
                <SponsorLogo src={sponsor.logoUrl} className={styles.logo} fallbackClassName={styles.logoFallback} />
                <span className={styles.copy}>
                  <span className={styles.label}>Sponsored</span>
                  <span className={styles.name}>{sponsor.name}</span>
                  <span className={styles.meta}>
                    {[sponsor.category, sponsor.area].filter(Boolean).join(" · ") || "Local business"}
                  </span>
                  {radio && sponsor.description ? <span className={styles.description}>{sponsor.description}</span> : null}
                  <span className={styles.action}>
                    {radio ? "Explore business" : "Patronise this local business"} <span aria-hidden="true">{radio ? "→" : "↗"}</span>
                  </span>
                </span>
              </Link>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.carouselControls}>
        <button type="button" className={styles.carouselArrow} onClick={() => go(active - 1)} aria-label="Previous business">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <div className={styles.carouselDots} role="group" aria-label="Carousel position">
          {sponsors.map((sponsor, index) => (
            <button
              key={sponsor.slug}
              type="button"
              aria-pressed={index === active}
              aria-label={`Show ${sponsor.name}`}
              className={`${styles.carouselDot} ${index === active ? styles.carouselDotActive : ""}`}
              onClick={() => go(index)}
            />
          ))}
        </div>
        <button type="button" className={styles.carouselArrow} onClick={() => go(active + 1)} aria-label="Next business">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
}
