"use client";

import { useEffect, useState } from "react";
import { BellIcon } from "./icons";
import { radioReminderKey } from "../lib/radio-reminder";

const OPT_IN = "epe-radio-open-page-reminder";
const LAST_SENT = "epe-radio-last-open-page-reminder";

/** An open-page reminder, not a background push subscription. */
export default function RadioReminder() {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    try { setEnabled(localStorage.getItem(OPT_IN) === "yes"); } catch { /* storage may be disabled */ }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const check = () => {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      const key = radioReminderKey(new Date());
      if (!key) return;
      try {
        if (localStorage.getItem(LAST_SENT) === key) return;
        const notification = new Notification("EPE LAWA Radio", { body: "The flyer lists EPE LAWA on Radio Lagos on Thursdays at 1:30 pm Lagos time." });
        notification.onclick = () => { window.focus(); window.location.assign("/radio"); notification.close(); };
        localStorage.setItem(LAST_SENT, key);
      } catch {
        setMessage("This browser could not display the reminder. Background notifications are not available yet.");
      }
    };
    check();
    const timer = window.setInterval(check, 30_000);
    return () => window.clearInterval(timer);
  }, [enabled]);

  async function enable() {
    if (!("Notification" in window) || !window.isSecureContext) {
      setMessage("Browser notifications are not supported here.");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setMessage("Notification permission was not granted. Check your browser settings to change it."); return; }
      localStorage.setItem(OPT_IN, "yes");
      setEnabled(true);
      setMessage("Reminder enabled for this browser while the site is open.");
    } catch { setMessage("The reminder could not be enabled in this browser."); }
  }

  function disable() {
    try { localStorage.removeItem(OPT_IN); } catch { /* no persistent setting to remove */ }
    setEnabled(false);
    setMessage("Radio reminder turned off.");
  }

  return <details className="radio-reminder">
    <summary className="btn-icon header-notification" aria-label="Radio notification settings"><BellIcon size={20} /></summary>
    <div className="radio-reminder__panel">
      <strong>Radio reminder</strong>
      <p>The flyer lists Thursday at 1:30 pm, Lagos time.</p>
      <p>Reminders work only while this site is open, and may be delayed or missed if your browser suspends the page. Background push is not available yet.</p>
      <button type="button" className="btn-secondary" onClick={enabled ? disable : () => void enable()}>{enabled ? "Turn reminder off" : "Enable open-page reminder"}</button>
      {message ? <p role="status">{message}</p> : null}
    </div>
  </details>;
}
