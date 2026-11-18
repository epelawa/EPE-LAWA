"use client";
import { useEffect, useState } from "react";
import { NOTIFICATION_SOUND_EVENT, NOTIFICATION_SOUND_STORAGE, notificationSoundId } from "../lib/notification-sound";

let audio: AudioContext | null = null;
async function playSound() {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") await audio.resume();
    if (audio.state !== "running") return false;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const now = audio.currentTime;
    oscillator.type = "sine"; oscillator.frequency.setValueAtTime(660, now); oscillator.frequency.setValueAtTime(880, now + .12);
    gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.09, now + .02); gain.gain.exponentialRampToValueAtTime(.0001, now + .32);
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(now); oscillator.stop(now + .33);
    return true;
  } catch { return false; }
}

/** Foreground only: service workers cannot play audio and OS push sound is device-controlled. */
export function NotificationSoundListener() {
  useEffect(() => {
    const seen = new Set<string>();
    const receive = (data: unknown) => {
      const id = notificationSoundId(data);
      if (!id || seen.has(id) || document.visibilityState !== "visible") return;
      try { if (localStorage.getItem(NOTIFICATION_SOUND_STORAGE) !== "on") return; } catch { return; }
      seen.add(id); if (seen.size > 100) seen.delete(seen.values().next().value!);
      void playSound();
    };
    const onWindow = (event: Event) => receive((event as CustomEvent).detail);
    const onWorker = (event: MessageEvent) => receive(event.data);
    window.addEventListener(NOTIFICATION_SOUND_EVENT, onWindow);
    navigator.serviceWorker?.addEventListener("message", onWorker);
    return () => { window.removeEventListener(NOTIFICATION_SOUND_EVENT, onWindow); navigator.serviceWorker?.removeEventListener("message", onWorker); };
  }, []);
  return null;
}

export function NotificationSoundSettings() {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { try { setEnabled(localStorage.getItem(NOTIFICATION_SOUND_STORAGE) === "on"); } catch { /* unavailable */ } }, []);
  async function toggle() {
    if (enabled) { try { localStorage.removeItem(NOTIFICATION_SOUND_STORAGE); setEnabled(false); setMessage("Sound disabled on this browser."); } catch { setMessage("Browser storage is unavailable."); } return; }
    if (!(await playSound())) { setMessage("Sound could not play. Check your browser and device settings."); return; }
    try { localStorage.setItem(NOTIFICATION_SOUND_STORAGE, "on"); setEnabled(true); setMessage("Sound enabled on this browser."); } catch { setMessage("Browser storage is unavailable; sound was not enabled."); }
  }
  return <div className="ui-stack-sm"><p><strong>Notification sound</strong></p><p>Play a short sound for supported alerts while this page is visible. Background notification sounds depend on your browser and device. Cloud messaging is not active yet.</p><button type="button" className="btn-secondary" onClick={() => void toggle()}>{enabled ? "Disable notification sound" : "Enable and test notification sound"}</button>{message ? <p role="status">{message}</p> : null}</div>;
}
