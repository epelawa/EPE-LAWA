"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * Storage notice.
 *
 * Preferences use localStorage; authenticated member sessions use essential
 * cookies. Optional analytics and advertising tracking are not enabled.
 * This notice describes storage rather than asking for unnecessary consent.
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
      className="storage-notice"
      role="region"
      aria-label="Storage notice"
    >
      <p className="storage-notice__title">Your browser, your preferences.</p>
      <div>
        <div>
          <div className="storage-notice__copy">
            Your theme and this choice stay in your browser. Signing in uses
            essential session cookies. No optional analytics or advertising tracking is enabled.
          </div>
          <div className="ui-actions">
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
