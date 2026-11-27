/**
 * Twelve-hour clock everywhere a person reads a time (owner brief, turn 24:
 * "6:47 pm", never "18:47:56"). Machine formats (HH:MM in forms, database
 * time columns, cron) stay 24-hour; only the words on screen change.
 */

export const LAGOS_TIME_ZONE = "Africa/Lagos";

/** "26 Nov 2026, 6:47 pm" */
export const DATE_TIME_12H: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: LAGOS_TIME_ZONE };
/** "26 Nov 2026, 6:47:56 pm" */
export const DATE_TIME_SECONDS_12H: Intl.DateTimeFormatOptions = { ...DATE_TIME_12H, second: "2-digit" };
/** "Thursday, 26 November 2026 at 6:47 pm" */
export const LONG_DATE_TIME_12H: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: LAGOS_TIME_ZONE };
/** "6:47 pm" */
export const TIME_12H: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit", hour12: true, timeZone: LAGOS_TIME_ZONE };
/** "6:47:56 pm" */
export const TIME_SECONDS_12H: Intl.DateTimeFormatOptions = { ...TIME_12H, second: "2-digit" };

/**
 * "18:47" or "18:47:56" (a wall-clock value with no date) → "6:47 pm".
 * Hand-formatted so server and browser always render identical text.
 * Anything unrecognised is returned unchanged.
 */
export function to12h(value: string | null | undefined, withSeconds = false): string {
  if (typeof value !== "string") return "";
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(value.trim());
  if (!match) return value;
  const hour = Number(match[1]);
  if (hour > 24) return value;
  const suffix = hour % 24 >= 12 ? "pm" : "am";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:${match[2]}${withSeconds && match[3] ? `:${match[3]}` : ""} ${suffix}`;
}

/** "08:00–17:00" → "8:00 am – 5:00 pm" (en dash or hyphen). */
export function range12h(value: string | null | undefined): string {
  if (typeof value !== "string") return "";
  const parts = value.split(/\s*[\u2013-]\s*/);
  return parts.length === 2 ? `${to12h(parts[0])} \u2013 ${to12h(parts[1])}` : value;
}

/** Hour of the day (0–23) → "6 pm"; used for hourly tables. */
export function hourLabel12h(hour: number): string {
  const h = ((Math.trunc(hour) % 24) + 24) % 24;
  return `${h % 12 === 0 ? 12 : h % 12} ${h >= 12 ? "pm" : "am"}`;
}

/** Lagos wall-clock parts of an instant, computed by hand (WAT is UTC+1 all year, no DST). */
export function lagosParts(ms: number) {
  const wat = new Date(ms + 60 * 60 * 1000);
  return { year: wat.getUTCFullYear(), month: wat.getUTCMonth(), day: wat.getUTCDate(), weekday: wat.getUTCDay(), hour: wat.getUTCHours(), minute: wat.getUTCMinutes(), second: wat.getUTCSeconds() };
}

export type DayPart = "morning" | "afternoon" | "evening" | "night";

/** 5 am–noon morning, noon–5 pm afternoon, 5–9 pm evening, otherwise night. */
export function dayPart(hour: number): DayPart {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}
