"use client";

import { useState } from "react";

type Option = { value: number; label: string };

/**
 * A dropdown of common values plus "Custom…", which opens a number field
 * (with minutes / hours / days for the interval). The server reads
 * `<name>`, `<name>_custom` and `<name>_unit`, and refuses values outside the limits.
 */
export function ChoiceWithCustom({ name, label, options, current, min, max, suffix, units, hint }: {
  name: string;
  label: string;
  options: Option[];
  current: number;
  min: number;
  max: number;
  suffix?: string;
  units?: boolean;
  hint?: string;
}) {
  const preset = options.some((option) => option.value === current);
  const [mode, setMode] = useState(preset ? String(current) : "custom");
  const initialUnit = units && current % 1440 === 0 ? "days" : units && current % 60 === 0 ? "hours" : "minutes";
  const [unit, setUnit] = useState(initialUnit);
  const divisor = unit === "days" ? 1440 : unit === "hours" ? 60 : 1;
  const unitMin = Math.max(1, Math.ceil(min / divisor));
  const unitMax = Math.floor(max / divisor);
  const custom = mode === "custom";
  return (
    <div className="ai-limit-field" style={{ display: "grid", gap: 6, fontSize: 14 }}>
      <label htmlFor={`${name}-choice`} style={{ fontWeight: 600 }}>{label}</label>
      <select id={`${name}-choice`} className="input" name={name} value={mode} onChange={(event) => setMode(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        <option value="custom">Custom…</option>
      </select>
      {custom ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            key={unit}
            className="input"
            type="number"
            inputMode="numeric"
            name={`${name}_custom`}
            aria-label={`${label} — custom value`}
            min={unitMin}
            max={unitMax}
            step={1}
            required
            defaultValue={preset ? undefined : Math.round(current / (units ? divisor : 1))}
            style={{ flex: "1 1 auto", minWidth: 0 }}
          />
          {units ? (
            <select className="input" name={`${name}_unit`} aria-label="Unit" value={unit} onChange={(event) => setUnit(event.target.value)} style={{ flex: "0 0 auto", width: "auto" }}>
              <option value="minutes">minutes</option>
              <option value="hours">hours</option>
              <option value="days">days</option>
            </select>
          ) : suffix ? <span style={{ whiteSpace: "nowrap" }}>{suffix}</span> : null}
        </div>
      ) : null}
      <small style={{ color: "hsl(var(--muted-foreground))", fontSize: 12 }}>
        {custom ? `Any whole number from ${unitMin.toLocaleString("en-NG")} to ${unitMax.toLocaleString("en-NG")}${units ? ` ${unit}` : ""}.` : null}
        {custom && hint ? " " : null}
        {hint}
      </small>
    </div>
  );
}

/** News schedule: every N minutes (with custom), or at set Lagos times the admin types in. */
export function NewsScheduleField({ interval, times, intervalOptions, min, max }: {
  interval: number;
  times: string[];
  intervalOptions: Option[];
  min: number;
  max: number;
}) {
  const [mode, setMode] = useState(times.length ? "times" : "interval");
  const [list, setList] = useState<string[]>(times.length ? times : ["07:00", "12:00", "18:00"]);
  const update = (index: number, value: string) => setList((current) => current.map((entry, at) => (at === index ? value : entry)));
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <fieldset style={{ border: 0, padding: 0, margin: 0, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <legend style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>When news runs</legend>
        {[["interval", "Every …"], ["times", "At set times"]].map(([value, text]) => (
          <label key={value} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", minHeight: 44, border: "1px solid hsl(var(--border))", borderRadius: 999, cursor: "pointer", background: mode === value ? "hsl(var(--muted, 210 20% 94%))" : "transparent", fontSize: 14 }}>
            <input type="radio" name="news_mode" value={value} checked={mode === value} onChange={() => setMode(value)} style={{ width: 20, height: 20, margin: 0 }} />
            {text}
          </label>
        ))}
      </fieldset>
      {mode === "interval" ? (
        <ChoiceWithCustom name="news_interval_minutes" label="News runs" options={intervalOptions} current={interval} min={min} max={max} units hint="The schedule is checked every 5 minutes." />
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          <input type="hidden" name="news_interval_minutes" value={interval} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>Run news at (Lagos time)</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {list.map((value, index) => (
              <span key={index} style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                <input className="input" type="time" name="news_time" value={value} required step={60} aria-label={`News time ${index + 1}`} onChange={(event) => update(index, event.target.value)} style={{ width: "auto" }} />
                {list.length > 1 ? (
                  <button type="button" className="btn-ghost" aria-label={`Remove ${value || "this time"}`} onClick={() => setList((current) => current.filter((_, at) => at !== index))} style={{ minWidth: 44, minHeight: 44 }}>×</button>
                ) : null}
              </span>
            ))}
            {list.length < 24 ? (
              <button type="button" className="btn-secondary" onClick={() => setList((current) => [...current, ""])} style={{ minHeight: 44 }}>+ Add a time</button>
            ) : null}
          </div>
          <small style={{ color: "hsl(var(--muted-foreground))", fontSize: 12 }}>One news run at each time, every day (up to 24). Runs start within 5 minutes of each time.</small>
        </div>
      )}
    </div>
  );
}

/**
 * One AI job's schedule: every pass, every N minutes (with custom), at set
 * Lagos times, or off. The server reads `sched_<job>_mode`,
 * `sched_<job>_minutes` (+ `_custom`/`_unit`) and `sched_<job>_time`.
 */
export function JobScheduleField({ job, label, hint, mode, minutes, times, intervalOptions, min, max }: {
  job: string;
  label: string;
  hint?: string;
  mode: "pass" | "interval" | "times" | "off";
  minutes: number;
  times: string[];
  intervalOptions: Option[];
  min: number;
  max: number;
}) {
  const [current, setCurrent] = useState<string>(mode);
  const [list, setList] = useState<string[]>(times.length ? times : ["08:00", "17:00"]);
  const update = (index: number, value: string) => setList((entries) => entries.map((entry, at) => (at === index ? value : entry)));
  const prefix = `sched_${job}`;
  const choices: [string, string][] = [["pass", "Whenever there's work"], ["interval", "Every …"], ["times", "At set times"], ["off", "Off"]];
  return (
    <fieldset style={{ display: "grid", gap: 10, border: "1px solid hsl(var(--border))", borderRadius: 14, padding: 14, margin: 0 }}>
      <legend style={{ fontWeight: 700, fontSize: 15, padding: "0 6px" }}>{label}</legend>
      {hint ? <small style={{ color: "hsl(var(--muted-foreground))", fontSize: 12, marginTop: -4 }}>{hint}</small> : null}
      <div role="radiogroup" aria-label={`${label}: when it runs`} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {choices.map(([value, text]) => (
          <label key={value} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", minHeight: 44, border: "1px solid hsl(var(--border))", borderRadius: 999, cursor: "pointer", background: current === value ? "hsl(var(--muted, 210 20% 94%))" : "transparent", fontSize: 14 }}>
            <input type="radio" name={`${prefix}_mode`} value={value} checked={current === value} onChange={() => setCurrent(value)} style={{ width: 20, height: 20, margin: 0 }} />
            {text}
          </label>
        ))}
      </div>
      {current === "interval" ? (
        <ChoiceWithCustom name={`${prefix}_minutes`} label="Runs" options={intervalOptions} current={minutes} min={min} max={max} units />
      ) : <input type="hidden" name={`${prefix}_minutes`} value={minutes} />}
      {current === "times" ? (
        <div style={{ display: "grid", gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Run at (Lagos time)</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {list.map((value, index) => (
              <span key={index} style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                <input className="input" type="time" name={`${prefix}_time`} value={value} required step={60} aria-label={`${label} time ${index + 1}`} onChange={(event) => update(index, event.target.value)} style={{ width: "auto" }} />
                {list.length > 1 ? <button type="button" className="btn-ghost" aria-label={`Remove ${value || "this time"}`} onClick={() => setList((entries) => entries.filter((_, at) => at !== index))} style={{ minWidth: 44, minHeight: 44 }}>×</button> : null}
              </span>
            ))}
            {list.length < 24 ? <button type="button" className="btn-secondary" onClick={() => setList((entries) => [...entries, ""])} style={{ minHeight: 44 }}>+ Add a time</button> : null}
          </div>
        </div>
      ) : null}
      <small style={{ color: "hsl(var(--muted-foreground))", fontSize: 12 }}>
        {current === "pass" ? "Checked every 5 minutes; it only does anything when something is waiting." : current === "off" ? "Never runs by itself. “Run now” above still works." : current === "times" ? "Once at each time, every day (up to 24). Starts within 5 minutes of each time." : "The schedule is checked every 5 minutes."}
      </small>
    </fieldset>
  );
}
