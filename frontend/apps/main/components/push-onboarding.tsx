"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { BellIcon } from "./icons";
import { OPEN_NOTIFICATIONS_EVENT } from "./notification-centre";
import { createClient } from "../lib/supabase.client";
import { anotherDialogIsOpen } from "../lib/site-search-events";
import {
  currentSubscription, enablePush, markOnboarding, onboardingSeen, pushPermission, pushSupport, type PushTopics,
} from "../lib/push-client";
import styles from "./push-onboarding.module.css";

type Phase = "intro" | "working" | "success" | "denied" | "error";

/** Routes where an interruption would get in the way of a task. */
const QUIET_ROUTES = /^\/(login|auth|forgot-password|newsletter|support|contact|advertise|enquiry|business-directory\/submit|forum\/new|itan-ilu-mi\/correction|dashboard)(\/|$)/;
const SHOW_AFTER_MS = 9000;

function busyWithForm() {
  const active = document.activeElement;
  return active instanceof HTMLElement && Boolean(active.closest("form")) && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName);
}

/**
 * First-visit push onboarding. Shown once, only to signed-in members (a push
 * subscription belongs to a member account), only when web push is enabled and
 * the browser supports it, never on task routes, over another dialog or while
 * the visitor is typing. The native permission prompt is requested only from
 * the "Enable notifications" click, and success is shown only after the server
 * confirms the subscription and topics were stored.
 */
export default function PushOnboarding() {
  const pathname = usePathname() ?? "/";
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [choosing, setChoosing] = useState(false);
  const [topics, setTopics] = useState<PushTopics>({ news: true, radio: true });
  const [message, setMessage] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const quiet = QUIET_ROUTES.test(pathname);

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
        const { data } = await createClient().auth.getSession();
        if (cancelled || !data.session?.user) return;
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

  return <section className={styles.card} role="dialog" aria-modal="false" aria-labelledby={titleId} data-push-onboarding>
    <div className={styles.mark} aria-hidden="true"><BellIcon size={20} /></div>
    {phase === "success" ? <>
      <h2 id={titleId} ref={headingRef} tabIndex={-1} className={styles.title}>You are connected.</h2>
      <p className={styles.copy}>We will send {topics.news && topics.radio ? "news and radio" : topics.news ? "news" : "radio"} updates to this device. Change this any time from the bell at the top of the page.</p>
      <div className={styles.actions}><button type="button" className="btn-primary" onClick={close}>Done</button></div>
    </> : phase === "denied" ? <>
      <h2 id={titleId} ref={headingRef} tabIndex={-1} className={styles.title}>Notifications are blocked</h2>
      <p className={styles.copy}>Your browser blocked notifications for EPE LAWA. To turn them on later, allow notifications for this site in your browser settings, then use the bell at the top of the page.</p>
      <div className={styles.actions}><button type="button" className="btn-secondary" onClick={close}>Close</button></div>
    </> : <>
      <h2 id={titleId} ref={headingRef} tabIndex={-1} className={styles.title}>Stay connected to Epe.</h2>
      <p className={styles.copy}>Get important local news and radio updates from EPE LAWA, delivered when they matter.</p>
      {choosing ? <fieldset className={styles.topics} disabled={working}>
        <legend className="sr-only">Choose what you receive</legend>
        <label className={styles.topic}>
          <span><span className={styles.topicLabel}>News</span><span className={styles.topicHint}>Breaking and important local stories.</span></span>
          <input type="checkbox" role="switch" className={styles.switch} checked={topics.news} onChange={() => setTopics((value) => ({ ...value, news: !value.news }))} />
        </label>
        <label className={styles.topic}>
          <span><span className={styles.topicLabel}>Radio</span><span className={styles.topicHint}>When EPE LAWA radio programmes go on air.</span></span>
          <input type="checkbox" role="switch" className={styles.switch} checked={topics.radio} onChange={() => setTopics((value) => ({ ...value, radio: !value.radio }))} />
        </label>
      </fieldset> : null}
      {message ? <p className={styles.error} role="alert">{message}</p> : null}
      <div className={styles.actions}>
        <button type="button" className="btn-primary" onClick={() => void enable()} disabled={working} aria-busy={working}>
          {working ? "Enabling…" : phase === "error" ? "Try again" : "Enable notifications"}
        </button>
        <button type="button" className="btn-secondary" onClick={dismiss} disabled={working}>Not now</button>
      </div>
      {!choosing ? <button type="button" className={styles.link} onClick={() => setChoosing(true)} disabled={working}>Choose what I receive</button> : null}
      {phase === "error" ? <button type="button" className={styles.link} onClick={manageLater}>Manage in notification settings</button> : null}
      <p className={styles.fine}>Your browser will ask for permission. You can turn this off at any time. <Link href="/privacy" className={styles.fineLink}>Privacy</Link></p>
    </>}
  </section>;
}
