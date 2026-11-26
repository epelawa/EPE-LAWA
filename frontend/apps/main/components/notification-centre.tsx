"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { BellIcon } from "./icons";
import { useRadioOpenPageReminder } from "./radio-reminder";
import { createClient } from "../lib/supabase.client";
import { trapTabKey } from "../lib/site-search-events";
import {
  currentSubscription, disablePush, enablePush, pushPermission, pushSupport, readTopics, rememberedSubscribed, saveTopics,
  type PushPermission, type PushSupport, type PushTopics,
} from "../lib/push-client";
import styles from "./notification-centre.module.css";

type Item = { id: string; kind: string; title: string; body: string; url: string | null; read_at: string | null; created_at: string };
type FeedState = "loading" | "signedout" | "ready" | "error";
type DeviceState = "checking" | "disabled" | "unsupported" | "signedout" | "denied" | "revoked" | "off" | "on";

export const OPEN_NOTIFICATIONS_EVENT = "ep-open-notifications";
const KIND_LABEL: Record<string, string> = {
  comment_reply: "Comment reply", forum_reply: "Forum reply", news_published: "Newsroom",
  radio_live: "Radio", moderation: "Moderation", order_status: "Account",
};
const TOPIC_COPY: Record<keyof PushTopics, { label: string; hint: string }> = {
  news: { label: "News", hint: "Breaking and important local stories from the newsroom." },
  radio: { label: "Radio", hint: "Updates when EPE LAWA radio programmes go on air." },
};

function when(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }).format(new Date(iso));
  } catch { return ""; }
}
const safePath = (url: string | null) => (url && /^\/[A-Za-z0-9/_?=&%.-]*$/.test(url) && !url.startsWith("//") ? url : null);

export default function NotificationCentre() {
  useRadioOpenPageReminder();
  const pathname = usePathname() ?? "/";
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [unread, setUnread] = useState(0);
  const [feed, setFeed] = useState<FeedState>("loading");
  const [items, setItems] = useState<Item[]>([]);
  const [marking, setMarking] = useState(false);
  const [feedMessage, setFeedMessage] = useState("");
  const [device, setDevice] = useState<DeviceState>("checking");
  const [topics, setTopics] = useState<PushTopics>({ news: true, radio: true });
  const [busy, setBusy] = useState<"" | "enable" | "disable" | "news" | "radio">("");
  const [pushMessage, setPushMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const titleId = useId();

  // Session is read locally (no network for visitors); unread count only for members.
  const refreshUnread = useCallback(async (uid: string) => {
    try {
      const { count, error } = await createClient().from("notifications").select("id", { count: "exact", head: true }).eq("user_id", uid).is("read_at", null);
      if (!error && typeof count === "number") setUnread(count);
    } catch { /* keep the previous badge */ }
  }, []);

  useEffect(() => {
    let cancelled = false;
    createClient().auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      if (uid) void refreshUnread(uid);
    }).catch(() => { if (!cancelled) setUserId(null); });
    return () => { cancelled = true; };
  }, [refreshUnread, pathname]);

  const loadFeed = useCallback(async () => {
    if (!userId) { setFeed(userId === null ? "signedout" : "loading"); return; }
    setFeed("loading");
    // A stalled network must end in the honest error + retry state, never an endless skeleton.
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 10000);
    try {
      const { data, error } = await createClient().from("notifications").select("id,kind,title,body,url,read_at,created_at")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(8).abortSignal(controller.signal);
      if (error) { setFeed("error"); return; }
      setItems((data ?? []) as Item[]);
      setFeed("ready");
    } catch { setFeed("error"); }
    finally { window.clearTimeout(timer); }
  }, [userId]);

  const loadDevice = useCallback(async () => {
    const support: PushSupport = pushSupport();
    if (support === "disabled") { setDevice("disabled"); return; }
    if (support === "unsupported") { setDevice("unsupported"); return; }
    if (!userId) { setDevice(userId === null ? "signedout" : "checking"); return; }
    const permission: PushPermission = pushPermission();
    const [subscription, stored] = await Promise.all([currentSubscription(), readTopics()]);
    if (permission === "denied") { setDevice(rememberedSubscribed() ? "revoked" : "denied"); return; }
    // Stored flags only describe what this member receives while subscribed; an unsubscribed device keeps the suggested defaults.
    if (permission === "granted" && subscription) { if (stored?.signedIn) setTopics(stored.topics); setDevice("on"); return; }
    setDevice(rememberedSubscribed() ? "revoked" : "off");
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    void loadFeed();
    void loadDevice();
  }, [open, loadFeed, loadDevice]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!open && !wasOpen.current) return;
    wasOpen.current = open;
    if (open && !dialog.open) dialog.showModal();
    if (!open) {
      if (dialog.open) dialog.close();
      triggerRef.current?.focus({ preventScroll: true });
      setPushMessage(null);
      setFeedMessage("");
    }
  }, [open]);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_NOTIFICATIONS_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_NOTIFICATIONS_EVENT, onOpen);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  async function markAllRead() {
    if (!userId || marking) return;
    setMarking(true);
    setFeedMessage("");
    try {
      const { error } = await createClient().from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
      if (error) { setFeedMessage("Could not mark notifications as read. Please try again."); return; }
      const now = new Date().toISOString();
      setItems((current) => current.map((item) => (item.read_at ? item : { ...item, read_at: now })));
      setUnread(0);
      setFeedMessage("All notifications marked as read.");
    } catch {
      setFeedMessage("Could not mark notifications as read. Check your connection and try again.");
    } finally { setMarking(false); }
  }

  async function turnOn() {
    setBusy("enable"); setPushMessage(null);
    const result = await enablePush(topics);
    setBusy("");
    if (result.ok) { setTopics(result.topics); setDevice("on"); setPushMessage({ tone: "ok", text: "Notifications are on for this device." }); return; }
    if (result.reason === "denied") setDevice("denied");
    if (result.reason === "signin") setDevice("signedout");
    setPushMessage({ tone: "error", text: result.message });
  }

  async function turnOff() {
    setBusy("disable"); setPushMessage(null);
    const result = await disablePush();
    setBusy("");
    if (result.ok) { setDevice("off"); setPushMessage({ tone: "ok", text: "Notifications are off for this device." }); return; }
    setPushMessage({ tone: "error", text: result.message });
  }

  async function toggleTopic(key: keyof PushTopics) {
    const next = { ...topics, [key]: !topics[key] };
    if (device !== "on") { setTopics(next); return; }
    setBusy(key); setPushMessage(null);
    const result = await saveTopics(next);
    setBusy("");
    if (result.ok) { setTopics(result.topics); setPushMessage({ tone: "ok", text: `${TOPIC_COPY[key].label} notifications ${result.topics[key] ? "on" : "off"}.` }); }
    else setPushMessage({ tone: "error", text: result.message });
  }

  const signIn = `/login?next=${encodeURIComponent(pathname)}`;
  const badge = unread > 0 ? (unread > 9 ? "9+" : String(unread)) : null;
  const topicsEditable = device === "on" || device === "off" || device === "revoked";

  return <>
    <button
      ref={triggerRef}
      type="button"
      className="btn-icon header-notification"
      aria-label={badge ? `Notifications, ${unread} unread` : "Notifications"}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={() => setOpen((value) => !value)}
    >
      <BellIcon size={20} />
      {badge ? <span className={styles.badge} aria-hidden="true">{badge}</span> : null}
    </button>
    <dialog
      ref={dialogRef}
      className={styles.panel}
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); setOpen(false); }}
      onClose={() => setOpen(false)}
      onClick={(event) => { if (event.target === dialogRef.current) setOpen(false); }}
      onKeyDown={(event) => trapTabKey(event, dialogRef.current)}
    >
      {open ? <div className={styles.surface}>
        <div className={styles.head}>
          <div>
            <h2 id={titleId} className={styles.title}>Notifications</h2>
            <p className={styles.subtitle}>Stay updated with what is happening across Epe.</p>
          </div>
          <button type="button" className={styles.close} aria-label="Close notifications" onClick={() => setOpen(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <section className={styles.section} aria-labelledby={`${titleId}-recent`}>
          <div className={styles.sectionHead}>
            <h3 id={`${titleId}-recent`} className={styles.sectionTitle}>Recent</h3>
            {feed === "ready" && items.some((item) => !item.read_at) ? <button type="button" className={styles.textButton} onClick={() => void markAllRead()} disabled={marking}>{marking ? "Marking…" : "Mark all as read"}</button> : null}
          </div>
          {feed === "loading" ? <><ul className={styles.skeleton} aria-hidden="true">{[0, 1].map((index) => <li key={index}><span /><span /></li>)}</ul><p className="sr-only" role="status">Loading notifications…</p></> : null}
          {feed === "signedout" ? <p className={styles.muted}>Replies to your comments and forum posts appear here when you are signed in. <Link className={styles.inlineLink} href={signIn}>Sign in</Link></p> : null}
          {feed === "error" ? <div className={styles.inlineState} role="alert"><p className={styles.muted}>Notifications could not be loaded.</p><button type="button" className="btn-secondary" onClick={() => void loadFeed()}>Try again</button></div> : null}
          {feed === "ready" && !items.length ? <p className={styles.muted}>No notifications yet. You have not missed anything.</p> : null}
          {feed === "ready" && items.length ? <ul className={styles.list}>{items.map((item) => {
            const href = safePath(item.url);
            const content = <>
              <span className={styles.itemKind}>{!item.read_at ? <span className={styles.unreadDot} aria-label="Unread" /> : null}{KIND_LABEL[item.kind] ?? "Update"} · <time dateTime={item.created_at}>{when(item.created_at)}</time></span>
              <span className={styles.itemTitle}>{item.title}</span>
              <span className={styles.itemBody}>{item.body}</span>
            </>;
            return <li key={item.id}>{href ? <Link className={styles.item} href={href} onClick={() => setOpen(false)}>{content}</Link> : <div className={styles.item}>{content}</div>}</li>;
          })}</ul> : null}
          {feedMessage ? <p className={styles.status} role="status">{feedMessage}</p> : null}
          {userId ? <Link className={styles.inlineLink} href="/dashboard?tab=notifications" onClick={() => setOpen(false)}>See all in your dashboard</Link> : null}
        </section>

        <section className={styles.section} aria-labelledby={`${titleId}-push`}>
          <div className={styles.sectionHead}>
            <h3 id={`${titleId}-push`} className={styles.sectionTitle}>Push notifications</h3>
            <span className={styles.pill} data-tone={device === "on" ? "on" : device === "denied" || device === "revoked" ? "warn" : "off"}>
              {device === "on" ? "On" : device === "denied" ? "Blocked" : device === "revoked" ? "Turned off" : device === "checking" ? "Checking…" : device === "unsupported" || device === "disabled" ? "Unavailable" : "Off"}
            </span>
          </div>
          {device === "disabled" ? <p className={styles.muted}>Push notifications are not available on EPE LAWA yet.</p> : null}
          {device === "unsupported" ? <p className={styles.muted}>This browser cannot receive push notifications. On iPhone or iPad, add EPE LAWA to your Home Screen first, then open it from there.</p> : null}
          {device === "signedout" ? <p className={styles.muted}>Push notifications are linked to a member account so you can manage them on every device. <Link className={styles.inlineLink} href={signIn}>Sign in</Link> to turn them on.</p> : null}
          {device === "denied" ? <p className={styles.muted}>Notifications are blocked for this site in your browser settings. Allow them there, then reopen this panel.</p> : null}
          {device === "revoked" ? <p className={styles.muted}>Notifications were turned off in this browser. Turn them on again to keep receiving updates.</p> : null}
          {topicsEditable ? <fieldset className={styles.topics} disabled={busy !== ""}>
            <legend className="sr-only">Choose what you receive</legend>
            {(Object.keys(TOPIC_COPY) as Array<keyof PushTopics>).map((key) => <label key={key} className={styles.topic}>
              <span className={styles.topicCopy}><span className={styles.topicLabel}>{TOPIC_COPY[key].label}</span><span className={styles.topicHint}>{TOPIC_COPY[key].hint}</span></span>
              <input type="checkbox" role="switch" className={styles.switch} checked={topics[key]} aria-busy={busy === key} onChange={() => void toggleTopic(key)} />
            </label>)}
          </fieldset> : null}
          {device === "off" || device === "revoked" ? <button type="button" className="btn-primary" onClick={() => void turnOn()} disabled={busy !== "" || (!topics.news && !topics.radio)}>{busy === "enable" ? "Turning on…" : "Enable notifications"}</button> : null}
          {device === "off" && !topics.news && !topics.radio ? <p className={styles.muted}>Choose at least one topic.</p> : null}
          {device === "on" ? <button type="button" className="btn-secondary" onClick={() => void turnOff()} disabled={busy !== ""}>{busy === "disable" ? "Turning off…" : "Turn off on this device"}</button> : null}
          {pushMessage ? <p className={styles.status} data-tone={pushMessage.tone} role={pushMessage.tone === "error" ? "alert" : "status"}>{pushMessage.text}</p> : null}
        </section>

        <p className={styles.foot}><Link className={styles.inlineLink} href="/radio/reminders" onClick={() => setOpen(false)}>Thursday radio reminder</Link> works while this site is open, without an account.</p>
      </div> : null}
    </dialog>
  </>;
}
