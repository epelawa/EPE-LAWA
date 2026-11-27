"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
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
 * sliding up from the bottom centre. Only when web push is enabled and the
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
  const [headline, setHeadline] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
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

  // The preview shows a real, current headline so visitors see exactly what an alert looks like.
  useEffect(() => {
    if (!visible || headline) return;
    let alive = true;
    fetch("/api/live/home", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { latest?: { items?: { title?: string }[] } } | null) => {
        const title = data?.latest?.items?.find((item) => typeof item.title === "string" && item.title.trim())?.title;
        if (alive && title) setHeadline(title.trim());
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [visible, headline]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && phase !== "working") dismiss(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

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

  return <section className={styles.card} role="dialog" aria-modal="false" aria-labelledby={titleId} data-push-onboarding data-phase={phase}>
    <button type="button" className={styles.close} onClick={dismiss} disabled={working} aria-label="Not now">×</button>
    <div className={styles.preview} aria-hidden="true" data-on={phase === "success" ? "true" : "false"}>
      <span className={styles.previewIcon}><img src="/brand-logo.png" alt="" width={22} height={20} /></span>
      <span className={styles.previewText}>
        <span className={styles.previewMeta}><strong>EPE LAWA</strong> · now</span>
        <span className={styles.previewTitle}>{phase === "success" ? "Alerts are on for this device ✓" : headline ?? "Breaking: news from Epe Division as it happens"}</span>
      </span>
      <span className={styles.bell}><BellIcon size={18} /></span>
    </div>
    {phase === "success" ? <>
      <h2 id={titleId} ref={headingRef} tabIndex={-1} className={styles.title}>You're in.</h2>
      <p className={styles.copy}>We'll send {topics.news && topics.radio ? "news and radio" : topics.news ? "news" : "radio"} alerts to this device. Change this any time from the bell at the top of the page.</p>
      <div className={styles.actions}><button type="button" className="btn-primary" onClick={close}>Done</button></div>
    </> : phase === "denied" ? <>
      <h2 id={titleId} ref={headingRef} tabIndex={-1} className={styles.title}>Alerts are blocked</h2>
      <p className={styles.copy}>Your browser blocked notifications for EPE LAWA. To turn them on later, allow notifications for this site in your browser's site settings, then use the bell at the top of the page.</p>
      <div className={styles.actions}><button type="button" className="btn-secondary" onClick={close}>Close</button></div>
    </> : <>
      <p className={styles.eyebrow}>Free alerts · no account needed</p>
      <h2 id={titleId} ref={headingRef} tabIndex={-1} className={styles.title}>Stay connected to Epe.</h2>
      <p className={styles.copy}>The stories that matter, the moment they break — and a nudge when EPE LAWA radio goes on air.</p>
      <fieldset className={styles.chips} disabled={working}>
        <legend className={styles.chipsLegend}>Send me</legend>
        <label className={styles.chip} data-checked={topics.news ? "true" : "false"}>
          <input type="checkbox" checked={topics.news} onChange={() => toggle("news")} />
          <span>News</span>
        </label>
        <label className={styles.chip} data-checked={topics.radio ? "true" : "false"}>
          <input type="checkbox" checked={topics.radio} onChange={() => toggle("radio")} />
          <span>Radio</span>
        </label>
      </fieldset>
      {working ? <p className={styles.hint} role="status"><span className={styles.pulse} aria-hidden="true" />Your browser is asking now — choose <strong>Allow</strong> in its pop-up.</p> : null}
      {message ? <p className={styles.error} role="alert">{message}</p> : null}
      <div className={styles.actions}>
        <button type="button" className="btn-primary" onClick={() => void enable()} disabled={working || topicCount === 0} aria-busy={working}>
          {working ? "Waiting for your browser…" : phase === "error" ? "Try again" : "Turn on alerts"}
        </button>
        <button type="button" className={styles.later} onClick={dismiss} disabled={working}>Maybe later</button>
      </div>
      {phase === "error" ? <button type="button" className={styles.link} onClick={manageLater}>Manage in notification settings</button> : null}
      <p className={styles.fine}>At most a few alerts a day. Turn them off any time from the bell. <Link href="/privacy" className={styles.fineLink}>Privacy</Link></p>
    </>}
  </section>;
}
