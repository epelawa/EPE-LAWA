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
