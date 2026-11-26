/**
 * Breaking-ticker time stamp in West Africa Time (UTC+1, no daylight saving).
 * Formatted by hand so server and browser render identical text (no Intl
 * differences, so no hydration mismatch). Example: "26 Nov · 16:23 WAT".
 */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function tickerStamp(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const wat = new Date(ms + 60 * 60 * 1000);
  const hh = String(wat.getUTCHours()).padStart(2, "0");
  const mm = String(wat.getUTCMinutes()).padStart(2, "0");
  return `${wat.getUTCDate()} ${MONTHS[wat.getUTCMonth()]} · ${hh}:${mm} WAT`;
}
