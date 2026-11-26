"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BellIcon } from "./icons";
import { radioReminderKey } from "../lib/radio-reminder";
import { NOTIFICATION_SOUND_EVENT } from "../lib/notification-sound";
import { NotificationSoundSettings } from "./notification-sound";

const OPT_IN = "epe-radio-open-page-reminder";
const LAST_SENT = "epe-radio-last-open-page-reminder";

/**
 * The Thursday open-page radio reminder. It runs only after the visitor opted in
 * on /radio/reminders and granted permission, and only while a page is open.
 * The header bell (Notification Centre) mounts it on every public route.
 */
export function useRadioOpenPageReminder() {
  useEffect(() => {
    const check = () => {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      const key = radioReminderKey(new Date());
      if (!key) return;
      try {
        if (localStorage.getItem(OPT_IN) !== "yes" || localStorage.getItem(LAST_SENT) === key) return;
        const notification = new Notification("EPE LAWA Radio", { body: "EPE LAWA on Radio Lagos: Thursday at 1:30 pm Lagos time." });
        notification.onclick = () => { window.focus(); window.location.assign("/radio"); notification.close(); };
        localStorage.setItem(LAST_SENT, key);
        window.dispatchEvent(new CustomEvent(NOTIFICATION_SOUND_EVENT, { detail: { type: NOTIFICATION_SOUND_EVENT, id: `radio_${key.replace(/[^a-zA-Z0-9_-]/g, "_")}` } }));
      } catch { /* Unsupported browser, blocked storage or notification failure. */ }
    };
    check();
    const timer = window.setInterval(check, 30_000);
    return () => window.clearInterval(timer);
  }, []);
}

/** Legacy standalone bell, kept for pages that link straight to radio reminder settings. */
export default function RadioReminder() {
  useRadioOpenPageReminder();
  return <Link href="/radio/reminders" className="btn-icon header-notification" aria-label="Radio notification settings"><BellIcon size={20} /></Link>;
}

export function RadioReminderSettings() {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const sync = () => { try { setEnabled(localStorage.getItem(OPT_IN) === "yes"); } catch { setEnabled(false); } };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  async function enable() {
    if (!("Notification" in window) || !window.isSecureContext) { setMessage("Notifications are not supported in this browser."); return; }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setMessage("Permission was not granted. You can change it in your browser settings."); return; }
      localStorage.setItem(OPT_IN, "yes");
      setEnabled(true);
      setMessage("Radio alert enabled.");
    } catch { setMessage("The alert could not be enabled in this browser."); }
  }

  function disable() {
    try { localStorage.removeItem(OPT_IN); } catch { setMessage("Browser storage is unavailable."); return; }
    setEnabled(false);
    setMessage("Radio alert disabled.");
  }

  return <div className="ui-stack-sm">
    <p>Every Thursday · 1:30 pm Lagos time</p>
    <p className="ui-muted">Works only while this site is open; a suspended page can miss an alert. Background push is not available.</p>
    <button type="button" className="btn-secondary" onClick={enabled ? disable : () => void enable()}>{enabled ? "Disable alert" : "Enable alert"}</button>
    {message ? <p role="status">{message}</p> : null}
    <NotificationSoundSettings />
  </div>;
}
