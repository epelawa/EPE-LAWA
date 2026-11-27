"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * Homepage-only storage notice. Preferences use localStorage; authenticated
 * member sessions use essential cookies. No advertising cookies are used; the
 * shared-head site script is disclosed on /privacy, so this copy points there.
 *
 * Not a modal: it must not trap focus or block the page, and "Got it" is enough
 * because nothing is being consented to that could be refused.
 *
 * Its measured height lets the hero keep its actions just above the floating
 * notice. It is cleared on dismissal and when leaving the homepage.
 */
export default function CookieBanner() {
  // Unknown until the stored choice is read, so a returning visitor never sees
  // the notice flash in and then vanish (which read as the banner "moving").
  const [show, setShow] = useState<boolean | null>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem("epelawa_cookie_consent")) {
        document.documentElement.style.setProperty("--storage-notice-height", "0px");
        setShow(false);
        return;
      }
    } catch {
      // The notice remains visible when browser storage is unavailable.
    }
    setShow(true);
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

  // Owner brief (turn 26): after "Got it" the notice slides down out of view
  // before it is removed. Reduced-motion visitors see it disappear at once.
  const [leaving, setLeaving] = useState(false);
  const finish = () => {
    document.documentElement.style.setProperty("--storage-notice-height", "0px");
    setShow(false);
  };
  const accept = () => {
    try {
      localStorage.setItem("epelawa_cookie_consent", "true");
    } catch {
      // Dismiss for this visit even if the preference cannot be stored.
    }
    if (leaving) return;
    const reduceMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) { finish(); return; }
    setLeaving(true);
    // Safety net in case animationend never fires (hidden tab, CSS not loaded).
    window.setTimeout(finish, 600);
  };

  if (show !== true) return null;

  return (
    <div ref={bannerRef} className={leaving ? "storage-notice storage-notice--leaving" : "storage-notice"} role="region" aria-label="Storage notice" onAnimationEnd={(event) => { if (leaving && event.target === event.currentTarget) finish(); }}>
      <p className="storage-notice__title">Your browser, your preferences.</p>
      <div className="storage-notice__copy">
        Sign-in uses essential cookies. See our privacy notice for details about information use.
      </div>
      <div className="ui-actions">
        <button type="button" className="btn-primary" onClick={accept} disabled={leaving}>Got it</button>
        <Link href="/privacy" className="btn-ghost">Privacy notice</Link>
      </div>
    </div>
  );
}
