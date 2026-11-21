"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./business-ad-carousel.module.css";

export type AdItem = {
  slug: string;
  name: string;
  categoryLabel: string;
  area: string | null;
  logoUrl: string | null;
  description: string | null;
};

const INTERVAL_MS = 5000;

export default function BusinessAdCarousel({ items }: { items: AdItem[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);
  const count = items.length;

  const go = useCallback((next: number) => { if (count > 0) setActive((previous) => ((next % count) + count) % count); }, [count]);

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive((previous) => (previous + 1) % count), INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  if (count === 0) return null;

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
      aria-label="Featured local businesses"
    >
      <div className={styles.window}>
        <div className={styles.track} style={{ transform: `translateX(-${active * 100}%)` }}>
          {items.map((item, index) => (
            <article className={styles.slide} key={item.slug} hidden={index !== active} aria-hidden={index !== active}>
              <div className={styles.card}>
                {item.logoUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img className={styles.logo} src={item.logoUrl} alt={`${item.name} logo`} width={72} height={72} loading="lazy" decoding="async" /> : <div className={styles.logoFallback} aria-hidden="true">{item.name.slice(0, 1)}</div>}
                <div className={styles.copy}>
                  <p className={styles.eyebrow}>Featured local business</p>
                  <h3 className={styles.name}><Link href={`/business-directory/${item.slug}`}>{item.name}</Link></h3>
                  <p className={styles.meta}>{[item.categoryLabel, item.area].filter(Boolean).join(" · ")}</p>
                  {item.description ? <p className={styles.description}>{item.description}</p> : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
      {count > 1 ? (
        <div className={styles.controls}>
          <button type="button" className={styles.arrow} onClick={() => go(active - 1)} aria-label="Previous business"><span aria-hidden="true">&#8592;</span></button>
          <div className={styles.dots} aria-label="Carousel position">
            {items.map((item, index) => (
              <button key={item.slug} type="button" aria-pressed={index === active} aria-label={`Show ${item.name}`} className={`${styles.dot} ${index === active ? styles.dotActive : ""}`} onClick={() => go(index)} />
            ))}
          </div>
          <button type="button" className={styles.arrow} onClick={() => go(active + 1)} aria-label="Next business"><span aria-hidden="true">&#8594;</span></button>
        </div>
      ) : null}
    </div>
  );
}
