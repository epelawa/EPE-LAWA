"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { lagosNow, toMinutes } from "../app/radio/programmes/on-air";
import styles from "./radio-schedule.module.css";
import { to12h } from "../lib/clock12";

export type RadioScheduleSlot = { id: string; day_of_week: number; starts_at: string; ends_at: string; note: string | null; programme: string | null };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hhmm = (value: string) => to12h(value);

/**
 * Weekly programme listings in West Africa Time. Only published schedule rows are
 * shown; when there are none the section says so plainly instead of inventing
 * cards. The database's Thursday reminder fallback is deliberately not shown here
 * because it is not a published programme.
 */
export default function RadioSchedule({ slots, initialDay, unavailable = false }: { slots: RadioScheduleSlot[]; initialDay: number; unavailable?: boolean }) {
  const [day, setDay] = useState(initialDay);
  const [now, setNow] = useState<{ day: number; minutes: number }>({ day: initialDay, minutes: -1 });
  useEffect(() => {
    const tick = () => setNow(lagosNow());
    tick();
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const daySlots = useMemo(() => slots.filter((slot) => slot.day_of_week === day).sort((a, b) => a.starts_at.localeCompare(b.starts_at)), [slots, day]);
  const today = now.day;
  const onAirId = day === today ? daySlots.find((slot) => {
    const start = toMinutes(slot.starts_at), end = toMinutes(slot.ends_at);
    if (start === null || end === null) return false;
    return now.minutes >= start && now.minutes < (end > start ? end : 1440);
  })?.id ?? null : null;
  const nextId = day === today ? daySlots.find((slot) => (toMinutes(slot.starts_at) ?? -1) > now.minutes)?.id ?? null : null;

  return <section className={styles.schedule} aria-labelledby="radio-schedule-title" id="schedule">
    <div className={styles.heading}>
      <div>
        <p className={styles.eyebrow}>Programme guide</p>
        <h2 id="radio-schedule-title">{day === today ? "Today on EPE LAWA Radio" : `${DAYS[day]} on EPE LAWA Radio`}</h2>
      </div>
      <p className={styles.zone}>All times WAT (UTC+1)</p>
    </div>

    {unavailable ? <div className={styles.empty} role="status">
      <h3>The schedule could not be loaded</h3>
      <p>Programme times are unavailable right now, so none are shown. Please try again later.</p>
    </div> : !slots.length ? <div className={styles.empty}>
      <h3>The schedule is being updated</h3>
      <p>Published EPE LAWA programme times will appear here. You can still listen to the stations above at any time.</p>
      <p><Link href="/radio/reminders">Get a browser notification when EPE LAWA Radio goes on air</Link></p>
    </div> : <>
      <div className={styles.days} role="group" aria-label="Choose a day">
        {SHORT.map((label, index) => <button key={label} type="button" aria-pressed={day === index} onClick={() => setDay(index)}>
          <span aria-hidden="true">{label}</span><span className="sr-only">{DAYS[index]}{index === today ? " (today)" : ""}</span>
          {index === today ? <span className={styles.todayMark} aria-hidden="true" /> : null}
        </button>)}
      </div>
      {daySlots.length ? <ol className={styles.list}>
        {daySlots.map((slot) => <li key={slot.id} className={styles.item} data-current={slot.id === onAirId ? "true" : undefined}>
          <span className={styles.time}><time>{hhmm(slot.starts_at)}</time><span aria-hidden="true">–</span><span className="sr-only"> to </span><time>{hhmm(slot.ends_at)}</time></span>
          <span className={styles.body}>
            <strong>{slot.programme ?? "EPE LAWA programme"}</strong>
            {slot.note ? <small>{slot.note}</small> : null}
          </span>
          {slot.id === onAirId ? <span className={styles.badge} data-kind="now">On air now (per schedule)</span> : slot.id === nextId ? <span className={styles.badge}>Up next</span> : null}
        </li>)}
      </ol> : <p className={styles.none}>No programmes are scheduled for {DAYS[day]}.</p>}
      <p className={styles.more}><Link href="/radio/programmes">See every programme</Link> · <a href="/api/radio/schedule.ics">Add the schedule to your calendar (.ics)</a></p>
    </>}
  </section>;
}
