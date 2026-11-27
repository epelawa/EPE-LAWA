"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { BellIcon } from "./icons";
import { OPEN_NOTIFICATIONS_EVENT } from "./notification-centre";
import { anotherDialogIsOpen } from "../lib/site-search-events";
import {
  currentSubscription, enablePush, markOnboarding, onboardingSeen, pushPermission, pushSupport, syncPush, type PushTopics,
} from "../lib/push-client";
import styles from "./push-onboarding.module.css";

type Phase = "intro" | "working" | "success" | "denied" | "error";

/** Routes where an interruption would get in the way of a task. */
const QUIET_ROUTES = /^\/(login|auth|forgot-password|newsletter|support|contact|advertise|enquiry|business-directory\/submit|forum\/new|itan-ilu-mi\/correction|dashboard)(\/|$)/;
/** Owner brief (turn 4): shown as soon as a visitor arrives; the short delay only lets the page paint first. */
const SHOW_AFTER_MS = 600;

function busyWithForm() {
  const active = document.activeElement;
  return active instanceof HTMLElement && Boolean(active.closest("form")) && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName);
}

/**
 * First-visit push onboarding. Shown once to every visitor (no account needed:
 * the browser subscription itself is the subscriber), as soon as they arrive,
 * as a centred modal over the dimmed page (owner's NEWZIA reference, turn 26). Only when web push is enabled and the
 * browser supports it, never on task routes, over another dialog or while the
 * visitor is typing. The native permission prompt is requested only from
 * the "Enable notifications" click, and success is shown only after the server
 * confirms the subscription and topics were stored.
 */
export default function PushOnboarding() {
  const pathname = usePathname() ?? "/";
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [topics, setTopics] = useState<PushTopics>({ news: true, radio: true });
  const [message, setMessage] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const copyId = useId();
  const cardRef = useRef<HTMLElement>(null);
  const quiet = QUIET_ROUTES.test(pathname);

  // Keeps an existing, already-permitted subscription registered (never prompts).
  useEffect(() => { void syncPush(); }, []);

  useEffect(() => {
    if (visible || quiet) return;
    if (pushSupport() !== "supported" || pushPermission() !== "default" || onboardingSeen()) return;
    let cancelled = false;
    let timer = 0;
    const attempt = async () => {
      if (cancelled) return;
      if (document.visibilityState !== "visible" || anotherDialogIsOpen() || busyWithForm()) {
        timer = window.setTimeout(attempt, 4000);
        return;
      }
      try {
        if (await currentSubscription()) { markOnboarding("enabled"); return; }
      } catch { return; }
      if (cancelled || onboardingSeen() || anotherDialogIsOpen() || busyWithForm()) return;
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setVisible(true);
    };
    timer = window.setTimeout(attempt, SHOW_AFTER_MS);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [quiet, visible]);

  useEffect(() => {
    if (visible) headingRef.current?.focus({ preventScroll: true });
  }, [visible, phase]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && phase !== "working") dismiss(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  // A real modal (dimmed page behind it), so Tab stays inside the card until it closes.
  function trapFocus(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key !== "Tab" || !cardRef.current) return;
    const items = [...cardRef.current.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], input:not(:disabled)")];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === headingRef.current)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function close() {
    setVisible(false);
    returnFocus.current?.focus?.({ preventScroll: true });
  }
  function dismiss() {
    if (phase === "intro" || phase === "error") markOnboarding("dismissed");
    close();
  }

  async function enable() {
    if (!topics.news && !topics.radio) { setMessage("Choose at least one topic, or select Not now."); return; }
    setPhase("working");
    setMessage("");
    const result = await enablePush(topics);
    if (result.ok) { markOnboarding("enabled"); setTopics(result.topics); setPhase("success"); return; }
    if (result.reason === "denied") { markOnboarding("denied"); setPhase("denied"); return; }
    setMessage(result.message);
    setPhase("error");
  }

  function manageLater() {
    close();
    window.dispatchEvent(new CustomEvent(OPEN_NOTIFICATIONS_EVENT));
  }

  if (!visible) return null;
  const working = phase === "working";
  const topicCount = Number(topics.news) + Number(topics.radio);
  const toggle = (key: keyof PushTopics) => setTopics((value) => ({ ...value, [key]: !value[key] }));

  // An original EPE LAWA permission experience: a light editorial card, cobalt
  // accents and a browser-owned permission step. The arrow stays visible from
  // consent through the browser prompt; live status text remains the instruction.
  return <div className={styles.overlay} data-push-onboarding data-phase={phase}>
    <div className={styles.scrim} aria-hidden="true" onClick={() => { if (!working) dismiss(); }} />
    {phase !== "success" && phase !== "denied" ? <div className={styles.permissionGuide} aria-hidden="true">
      <svg viewBox="0 0 160 560" preserveAspectRatio="none" fill="none">
        <path className={styles.guideArrow} d="M22 548C20 454 43 407 84 353c43-56 63-101 53-175m-17 24 17-24 17 24" />
      </svg>
    </div> : null}
    <section ref={cardRef} className={styles.card} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={copyId} onKeyDown={trapFocus}>
      <button type="button" className={styles.close} onClick={phase === "success" || phase === "denied" ? close : dismiss} disabled={working} aria-label="Close">
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
      {phase === "success" ? <>
        <span className={`${styles.badge} ${styles.badgeOn}`} aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg></span>
        <h2 id={titleId} ref={headingRef} tabIndex={-1} className={styles.title}>Alerts are on</h2>
        <p id={copyId} className={styles.copy}>We&apos;ll send {topics.news && topics.radio ? "news and radio" : topics.news ? "news" : "radio"} alerts to this device. Change this any time from the bell at the top of the page.</p>
        <button type="button" className={styles.cta} onClick={close}>Done</button>
      </> : phase === "denied" ? <>
        <h2 id={titleId} ref={headingRef} tabIndex={-1} className={styles.title}>Alerts are blocked</h2>
        <p id={copyId} className={styles.copy}>Your browser blocked notifications for EPE LAWA. To turn them on later, allow notifications for this site in your browser&apos;s settings, then use the bell at the top of the page.</p>
        <button type="button" className={`${styles.cta} ${styles.ctaQuiet}`} onClick={close}>Close</button>
      </> : <>
        <span className={styles.brandMark} aria-hidden="true"><BellIcon size={21} /></span>
        <p className={styles.eyebrow}>EPE LAWA · COMMUNITY UPDATES</p>
        <h2 id={titleId} ref={headingRef} tabIndex={-1} className={styles.title}>Good things happen in Epe. Be there for them.</h2>
        <p id={copyId} className={styles.copy}>Get Epe Division news the moment it breaks, and a nudge when EPE LAWA radio goes on air. Free, and no account needed.</p>
        <div className={styles.browserNote}>
          <span className={styles.noteIcon} aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M5 16v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"/></svg></span>
          <span><strong>Your browser stays in control</strong><small>Choose topics first. We&apos;ll ask your browser only when you tap below.</small></span>
          <svg className={styles.noteArrow} aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg>
        </div>
        <fieldset className={styles.pills} disabled={working}>
          <legend className="sr-only">Send me alerts about</legend>
          <label className={styles.pill} data-checked={topics.news ? "true" : "false"}>
            <input type="checkbox" checked={topics.news} onChange={() => toggle("news")} />
            <span>News</span>
          </label>
          <label className={styles.pill} data-checked={topics.radio ? "true" : "false"}>
            <input type="checkbox" checked={topics.radio} onChange={() => toggle("radio")} />
            <span>Radio</span>
          </label>
        </fieldset>
        {working ? <p className={styles.hint} role="status"><span className={styles.pulse} aria-hidden="true" />Look for your browser&apos;s permission prompt and choose <strong>Allow</strong> to turn alerts on.</p> : null}
        {message ? <p className={styles.error} role="alert">{message}</p> : null}
        <button type="button" className={styles.cta} onClick={() => void enable()} disabled={working || topicCount === 0} aria-busy={working}>
          {working ? "Waiting for your browser…" : phase === "error" ? "Try again" : "Continue to browser prompt"}
        </button>
        <button type="button" className={styles.later} onClick={dismiss} disabled={working}>Not now</button>
        {phase === "error" ? <button type="button" className={styles.link} onClick={manageLater}>Manage in notification settings</button> : null}
        <p className={styles.fine}>A few alerts a day at most. <Link href="/privacy" className={styles.fineLink}>Privacy</Link></p>
      </>}
    </section>
  </div>;
}
