"use client";

import { useEffect, useState } from "react";
import { dayPart, lagosParts, type DayPart } from "../lib/clock12";
import styles from "./lagos-live-clock.module.css";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const GREETING: Record<DayPart, string> = { morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening", night: "Good night" };
const PART_LABEL: Record<DayPart, string> = { morning: "Morning", afternoon: "Afternoon", evening: "Evening", night: "Night" };

const two = (value: number) => String(value).padStart(2, "0");

/** Everything the clock shows, computed by hand in WAT so server and browser agree. */
export function clockFace(ms: number) {
  const t = lagosParts(ms);
  const part = dayPart(t.hour);
  const hour12 = t.hour % 12 === 0 ? 12 : t.hour % 12;
  return {
    part,
    greeting: GREETING[part],
    partLabel: PART_LABEL[part],
    time: `${hour12}:${two(t.minute)}`,
    seconds: two(t.second),
    meridiem: t.hour >= 12 ? "pm" : "am",
    date: `${WEEKDAYS[t.weekday]}, ${t.day} ${MONTHS[t.month]} ${t.year}`,
    iso: new Date(ms).toISOString(),
    /** Share of the day gone, for the thin progress line (0–100). */
    dayProgress: Math.round(((t.hour * 3600 + t.minute * 60 + t.second) / 86400) * 1000) / 10,
  };
}

function PartIcon({ part }: { part: DayPart }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (part === "night") return <svg {...common}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></svg>;
  if (part === "evening") return <svg {...common}><path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 4v3M4.9 9.9l1.4 1.4M19.1 9.9l-1.4 1.4M9 22h6" /></svg>;
  if (part === "morning") return <svg {...common}><path d="M3 18h18M8 18a4 4 0 0 1 8 0M12 6V3M5.6 11.6 4.2 10.2M18.4 11.6l1.4-1.4M9 9l3-3 3 3" /></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
}

/**
 * Live Lagos clock for the news section: the time to the second on the
 * twelve-hour clock, the date, and a morning / afternoon / evening / night
 * greeting. Starts from the server's render time and ticks on each whole
 * second in the browser.
 */
export default function LagosLiveClock({ initialTime, place = "Epe" }: { initialTime: number; place?: string }) {
  const [now, setNow] = useState(initialTime);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      timer = setTimeout(tick, 1000 - (current % 1000) + 5);
    };
    tick();
    const onVisible = () => { if (document.visibilityState === "visible") { clearTimeout(timer); tick(); } };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, []);
  const face = clockFace(now);
  return <aside className={styles.clock} data-part={face.part} aria-label="Current time in Lagos">
    <div className={styles.top}>
      <span className={styles.icon}><PartIcon part={face.part} /></span>
      <p className={styles.greeting} suppressHydrationWarning>{face.greeting}, {place}</p>
      <span className={styles.chip} suppressHydrationWarning>{face.partLabel}</span>
    </div>
    <time className={styles.time} dateTime={face.iso} role="timer" aria-live="off" suppressHydrationWarning>
      <span className={styles.hm} suppressHydrationWarning>{face.time}</span>
      <span className={styles.sec} suppressHydrationWarning>:{face.seconds}</span>
      <span className={styles.ampm} suppressHydrationWarning>{face.meridiem}</span>
    </time>
    <p className={styles.date} suppressHydrationWarning>{face.date}<span aria-hidden="true"> · </span><span className={styles.zone}>Lagos time (WAT)</span></p>
    <div className={styles.progress} aria-hidden="true"><span style={{ width: `${face.dayProgress}%` }} /></div>
  </aside>;
}
