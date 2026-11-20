"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./sponsor-popup.module.css";

type Sponsor = { name: string; slug: string; category: string | null; area: string | null };

const sessionKey = "epelawa-sponsor-popup-seen";
const exposureMs = 2000;
const exitMs = 120;

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function SponsorPopup({ sponsor }: { sponsor: Sponsor }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const [remaining, setRemaining] = useState(exposureMs / 1000);
  const box = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!pathname || /^\/(admin|auth|login|forgot-password|support)(\/|$)/.test(pathname)) return;
    try {
      if (sessionStorage.getItem(sessionKey)) return;
    } catch {
      return;
    }
    const timer = window.setTimeout(() => {
      const active = document.activeElement;
      if (document.hidden || document.querySelector("dialog[open], [role=dialog][aria-modal=true]") || (active instanceof HTMLElement && active.closest("form"))) return;
      try {
        sessionStorage.setItem(sessionKey, "1");
      } catch {
        return;
      }
      setRemaining(exposureMs / 1000);
      setVisible(true);
    }, 10000);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (!visible || paused || leaving) return;
    const timer = window.setTimeout(() => {
      if (document.hidden) return;
      if (remaining <= 1) dismiss();
      else setRemaining(remaining - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [visible, paused, remaining, leaving]);

  useEffect(() => {
    if (!visible) return;
    const dismissForForm = (event: FocusEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("form, dialog, [role=dialog]")) dismiss();
    };
    document.addEventListener("focusin", dismissForForm);
    return () => document.removeEventListener("focusin", dismissForForm);
  }, [visible]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden || !!box.current?.matches(":hover, :focus-within"));
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => setVisible(false), exitMs);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  function dismiss() {
    if (box.current?.contains(document.activeElement)) document.getElementById("main")?.focus();
    setLeaving(true);
  }

  if (!visible) return null;

  return (
    <aside
      ref={box}
      className={styles.popup}
      data-leaving={leaving}
      role="status"
      aria-live="polite"
      aria-label="Sponsored local business"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(!!box.current?.contains(document.activeElement))}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div className={styles.copy}>
        <span className={styles.label}>Sponsored · Local business</span>
        <strong>{sponsor.name}</strong>
        <span>{[sponsor.category, sponsor.area].filter(Boolean).join(" · ") || "Discover a local business"}</span>
        <Link href={`/business-directory/${encodeURIComponent(sponsor.slug)}`}>
          Patronise this local business <ArrowIcon />
        </Link>
      </div>
      <div className={styles.controls}>
        <button type="button" onClick={dismiss}>Close now</button>
        <small aria-hidden="true">{paused ? "Paused" : `Closes in ${remaining}s`}</small>
      </div>
    </aside>
  );
}
