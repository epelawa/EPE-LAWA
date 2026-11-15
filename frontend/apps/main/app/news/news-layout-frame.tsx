"use client";

import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { NEWS_LAYOUTS, selectNewsLayout } from "../../lib/news-daily-layout.mjs";
import styles from "./news.module.css";

type Layout = (typeof NEWS_LAYOUTS)[number];

export default function NewsLayoutFrame({ initialLayout, children, className = "", ...props }: HTMLAttributes<HTMLDivElement> & { initialLayout: Layout; children: ReactNode }) {
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const startedAtMinute = Math.floor(Date.now() / 60_000);
    const clear = () => { if (timer.current !== undefined) window.clearTimeout(timer.current); };
    const schedule = () => {
      clear();
      const active = document.activeElement;
      const typingInSearch = active instanceof HTMLElement && !!active.closest('form[role="search"]') && (active instanceof HTMLInputElement || active instanceof HTMLButtonElement);
      if (!typingInSearch) setLayout(selectNewsLayout(Math.floor(Date.now() / 60_000) - startedAtMinute));
      timer.current = window.setTimeout(schedule, 60_000 - (Date.now() % 60_000) + 5);
    };
    const onVisibility = () => { if (document.visibilityState === "visible") schedule(); };
    schedule();
    document.addEventListener("visibilitychange", onVisibility);
    return () => { clear(); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);

  return <div className={`ui-page ${styles.newsPage} ${className}`} data-news-layout={layout} {...props}>{children}</div>;
}
