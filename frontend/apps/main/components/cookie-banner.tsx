"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * Homepage-only storage notice.
 *
 * Preferences use localStorage; authenticated member sessions use essential
 * cookies. Optional analytics and advertising tracking are not enabled.
 * This notice describes storage rather than asking for unnecessary consent.
 *
 * Not a modal: it must not trap focus or block the page, and "Got it" is enough
 * because nothing is being consented to that could be refused.
 *
 * Its measured height lets homepage connectivity toasts sit above the floating
 * card. It is cleared on dismissal and when leaving the homepage.
 */
export default function CookieBanner() {
  const [show, setShow] = useState(true);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem("epelawa_cookie_consent")) {
        document.documentElement.style.setProperty("--storage-notice-height", "0px");
        setShow(false);
      }
    } catch {
      // The notice remains visible when browser storage is unavailable.
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (!show) {
      root.style.setProperty("--storage-notice-height", "0px");
      return;
    }

    const node = bannerRef.current;
    if (!node) return;
    const apply = () => root.style.setProperty("--storage-notice-height", `${node.offsetHeight}px`);
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
      root.style.setProperty("--storage-notice-height", "0px");
    };
  }, [show]);

  const accept = () => {
    try {
      localStorage.setItem("epelawa_cookie_consent", "true");
    } catch {
      // Dismiss for this visit even if the preference cannot be stored.
    }
    document.documentElement.style.setProperty("--storage-notice-height", "0px");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div ref={bannerRef} className="storage-notice" role="region" aria-label="Storage notice">
      <p className="storage-notice__title">Your browser, your preferences.</p>
      <div className="storage-notice__copy">
        Theme choice stays on this device. Sign-in uses essential session cookies; optional tracking is off.
      </div>
      <div className="ui-actions">
        <button type="button" className="btn-primary" onClick={accept}>Got it</button>
        <Link href="/privacy" className="btn-ghost">Privacy notice</Link>
      </div>
    </div>
  );
}
