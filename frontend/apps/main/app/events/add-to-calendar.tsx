"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./events.module.css";

/**
 * "Add to calendar" for one event: Google Calendar (opens a pre-filled event)
 * or an .ics file that Apple Calendar, Outlook and Android calendar apps open.
 */
export default function AddToCalendar({ title, googleUrl, icsUrl }: { title: string; googleUrl: string; icsUrl: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div className={styles.calendar} ref={root}>
      <button type="button" className="btn-secondary" aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)}>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M12 14v4M10 16h4" /></svg>
        Add to calendar
      </button>
      <ul id={id} hidden={!open} className={styles.calendarMenu} aria-label={`Add ${title} to a calendar`}>
        <li><a className="btn-secondary" href={googleUrl} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>Google Calendar<span className="sr-only"> (opens in a new tab)</span></a></li>
        <li><a className="btn-secondary" href={icsUrl} download onClick={() => setOpen(false)}>Apple, Outlook or phone calendar (.ics)</a></li>
      </ul>
    </div>
  );
}
