import { lagosParts, to12h } from "./clock12";

/**
 * Breaking-ticker time stamp in West Africa Time (UTC+1, no daylight saving),
 * on the twelve-hour clock. Formatted by hand so server and browser render
 * identical text (no Intl differences, so no hydration mismatch).
 * Example: "26 Nov · 4:23 pm".
 */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function tickerStamp(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const wat = lagosParts(ms);
  return `${wat.day} ${MONTHS[wat.month]} · ${to12h(`${wat.hour}:${String(wat.minute).padStart(2, "0")}`)}`;
}
