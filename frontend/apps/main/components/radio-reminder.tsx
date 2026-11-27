"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BellIcon } from "./icons";
import {
  currentSubscription, disablePush, enablePush, pushPermission, pushSupport, readTopics, saveTopics, type PushTopics,
} from "../lib/push-client";
import { NotificationSoundSettings } from "./notification-sound";

const LEGACY_OPT_IN = "epe-radio-open-page-reminder";
const LEGACY_LAST_SENT = "epe-radio-last-open-page-reminder";

/**
 * Radio reminders are now real background push notifications, scheduled by the
 * database at each programme's start time (public.push_radio_tick via pg_cron)
 * and delivered even when no EPE LAWA page is open. The old open-page reminder
 * is retired; this hook only clears its leftover browser setting so nobody gets
 * the same alert twice.
 */
export function useRadioOpenPageReminder() {
  useEffect(() => {
    try { localStorage.removeItem(LEGACY_OPT_IN); localStorage.removeItem(LEGACY_LAST_SENT); } catch { /* storage blocked */ }
  }, []);
}

/** Legacy standalone bell, kept for pages that link straight to radio notification settings. */
export default function RadioReminder() {
  useRadioOpenPageReminder();
  return <Link href="/radio/reminders" className="btn-icon header-notification" aria-label="Radio notification settings"><BellIcon size={20} /></Link>;
}

type State = "checking" | "unavailable" | "denied" | "on" | "off";

/**
 * `confirm` adds an explicit confirm/cancel step before the browser permission prompt
 * (used on /radio, where the card sits beside the player). The permission prompt is
 * only ever triggered by a click; a device that already granted it is not asked again.
 */
export function RadioReminderSettings({ confirm = false, compact = false }: { confirm?: boolean; compact?: boolean } = {}) {
  useRadioOpenPageReminder();
  const [confirming, setConfirming] = useState(false);
  const [state, setState] = useState<State>("checking");
  const [topics, setTopics] = useState<PushTopics>({ news: false, radio: true });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (pushSupport() !== "supported") { setState("unavailable"); return; }
      if (pushPermission() === "denied") { setState("denied"); return; }
      const stored = await readTopics();
      if (cancelled) return;
      if (stored?.subscribed) { setTopics(stored.topics); setState(stored.topics.radio ? "on" : "off"); return; }
      setState("off");
    })();
    return () => { cancelled = true; };
  }, []);

  async function turnOn() {
    setConfirming(false); setBusy(true); setMessage("");
    const subscribed = await currentSubscription();
    const next = { ...topics, radio: true };
    const result = subscribed && pushPermission() === "granted" ? await saveTopics(next) : await enablePush(next);
    setBusy(false);
    if (result.ok) { setTopics(result.topics); setState("on"); setMessage("Radio notifications are on for this device."); return; }
    if (result.reason === "denied") setState("denied");
    setMessage(result.message);
  }

  async function turnOff() {
    setBusy(true); setMessage("");
    const next = { ...topics, radio: false };
    const result = next.news ? await saveTopics(next) : await disablePush();
    setBusy(false);
    if (result.ok) { setTopics(next); setState("off"); setMessage("Radio notifications are off for this device."); return; }
    setMessage(result.message);
  }

  return <div className="ui-stack-sm">
    {/* Turn 5: the Thursday 1:30 pm send is a database fallback, not a published programme, so
        it is described as reminder timing and never shown as a scheduled show. */}
    <p className="ui-muted">This is a browser push notification on this device, sent automatically the moment a scheduled EPE LAWA programme goes on air, even when this site is closed. No account needed.</p>
    <p className="ui-muted">While the programme schedule is being updated, one weekly reminder is sent on Thursdays at 1:30 pm WAT.</p>
    {state === "unavailable" ? <p className="ui-muted">Push notifications are not available in this browser. On iPhone or iPad, add EPE LAWA to your Home Screen first, then open it from there.</p> : null}
    {state === "denied" ? <p className="ui-muted">Notifications are blocked for this site. Allow them in your browser settings, then reload this page.</p> : null}
    {state === "off" && confirm && !confirming ? <button type="button" className="btn-secondary" onClick={() => setConfirming(true)}>Remind me when radio goes on air</button> : null}
    {state === "off" && confirm && confirming ? <div className="ui-stack-sm" role="group" aria-label="Confirm radio notifications">
      <p>Turn on radio notifications for this browser? {pushPermission() === "granted" ? "Notifications are already allowed here, so you will not be asked again." : "Your browser will ask for permission next."}</p>
      <div className="ui-actions">
        <button type="button" className="btn-primary" onClick={() => void turnOn()} disabled={busy} aria-busy={busy}>{busy ? "Turning on…" : "Turn on radio notifications"}</button>
        <button type="button" className="btn-ghost" onClick={() => setConfirming(false)} disabled={busy}>Cancel</button>
      </div>
    </div> : null}
    {state === "off" && !confirm ? <button type="button" className="btn-secondary" onClick={() => void turnOn()} disabled={busy} aria-busy={busy}>{busy ? "Turning on…" : "Turn on radio notifications"}</button> : null}
    {state === "on" ? <button type="button" className="btn-secondary" onClick={() => void turnOff()} disabled={busy} aria-busy={busy}>{busy ? "Turning off…" : "Turn off radio notifications"}</button> : null}
    {message ? <p role="status">{message}</p> : null}
    {compact ? null : <NotificationSoundSettings />}
  </div>;
}
