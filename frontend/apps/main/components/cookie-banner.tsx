"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * Storage notice.
 *
 * The previous copy said "we use cookies" while /privacy says no cookies are set.
 * Both cannot be true. This site sets no cookies — it stores three preferences in
 * localStorage — so the notice says that instead.
 *
 * Not a modal: it must not trap focus or block the page, and "Got it" is enough
 * because nothing is being consented to that could be refused.
 *
 * It also publishes its own height as `--storage-notice-height`, which is how
 * the connectivity toast positions itself above the banner instead of on top of
 * it. A guessed offset would be wrong at one of the five breakpoints.
 */
export default function CookieBanner() {
  const [show, setShow] = useState(true);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const accepted = localStorage.getItem("epelawa_cookie_consent");
    if (accepted) setShow(false);
  }, []);

  useEffect(() => {
    if (!show) return;
    const node = bannerRef.current;
    if (!node) return;

    const root = document.documentElement;
    const apply = () => {
      root.style.setProperty("--storage-notice-height", `${node.offsetHeight}px`);
    };
    apply();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(apply);
      observer.observe(node);
    }
    window.addEventListener("resize", apply);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", apply);
      root.style.removeProperty("--storage-notice-height");
    };
  }, [show]);

  const accept = () => {
    localStorage.setItem("epelawa_cookie_consent", "true");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      ref={bannerRef}
      className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card shadow-lg"
      role="region"
      aria-label="Storage notice"
    >
      <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            This site does not set cookies. It stores your theme choice and this
            answer in your browser, and nothing is shared with anyone.
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-primary" onClick={accept}>
              Got it
            </button>
            <Link href="/privacy" className="btn-ghost">
              Privacy notice
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
