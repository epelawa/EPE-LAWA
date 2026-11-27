/** Exact Lagos (WAT) timestamps for audit screens, independent of the server's timezone. */
// Twelve-hour clock for people ("26 Nov 2026, 6:47:56 pm WAT"); lagosHour below stays numeric.
const exact = new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
const clock = new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" });

export function lagosExact(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : `${exact.format(date)} WAT`;
}

export function lagosClock(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : clock.format(date);
}

/** YYYY-MM-DD of a moment in Lagos. */
export function lagosDay(value: Date | string = new Date()): string {
  return day.format(typeof value === "string" ? new Date(value) : value);
}

export function lagosHour(value: string): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", hour12: false }).format(new Date(value))) % 24;
}

/** UTC range covering one Lagos calendar day (WAT is UTC+1 all year). */
export function lagosDayRange(dayValue: string): { since: string; until: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayValue)) return null;
  const start = new Date(`${dayValue}T00:00:00+01:00`);
  // Reject impossible dates (2026-02-30 would otherwise roll into March).
  if (Number.isNaN(start.getTime()) || lagosDay(start) !== dayValue) return null;
  return { since: start.toISOString(), until: new Date(start.getTime() + 24 * 3600_000).toISOString() };
}

/** datetime-local value (Lagos time) for an ISO timestamp. */
export function lagosInputValue(value: string | null): string {
  if (!value) return "";
  const date = new Date(new Date(value).getTime() + 3600_000);
  return date.toISOString().slice(0, 16);
}
