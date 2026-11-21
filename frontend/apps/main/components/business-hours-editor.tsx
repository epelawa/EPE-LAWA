"use client";

import { useState } from "react";

const DAYS = [
  ["monday", "Monday"], ["tuesday", "Tuesday"], ["wednesday", "Wednesday"],
  ["thursday", "Thursday"], ["friday", "Friday"], ["saturday", "Saturday"], ["sunday", "Sunday"],
] as const;

type Day = (typeof DAYS)[number][0];
type Entry = { open: string; close: string };

function serialize(entries: Record<string, Entry>): string {
  return JSON.stringify(Object.fromEntries(
    Object.entries(entries)
      .filter(([, value]) => Boolean(value.open && value.close))
      .map(([day, value]) => [day, `${value.open}\u2013${value.close}`]),
  ));
}

/** Weekly hours editor. Empty times mean closed; the serialized JSON ships with the form. */
export default function BusinessHoursEditor({ name = "hours_json" }: { name?: string }) {
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const update = (day: Day, patch: Partial<Entry>) => {
    setEntries((current) => {
      const next = { ...current, [day]: { ...current[day], ...patch } };
      if (!next[day].open && !next[day].close) delete next[day];
      return next;
    });
  };

  return (
    <fieldset className="ui-stack-sm">
      <legend className="label">Opening hours (optional)</legend>
      <input type="hidden" name={name} value={serialize(entries)} />
      <p className="ui-meta">Leave both fields blank for days you are closed. Times are local Epe time.</p>
      <div className="ui-form-grid">
        {DAYS.map(([day, label]) => {
          const entry = entries[day] ?? { open: "", close: "" };
          const hint = entry.open || entry.close ? "add both times or clear both" : "";
          return (
            <div className="ui-field" key={day}>
              <span className="label">{label}{hint ? ` — ${hint}` : ""}</span>
              <span className="ui-row" style={{ alignItems: "center" }}>
                <input type="time" aria-label={`${label} opening time`} value={entry.open} onChange={(event) => update(day, { open: event.target.value })} className="input" />
                <span aria-hidden="true">–</span>
                <input type="time" aria-label={`${label} closing time`} value={entry.close} onChange={(event) => update(day, { close: event.target.value })} className="input" />
              </span>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
