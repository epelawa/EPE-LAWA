const LAGOS_DAY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Lagos",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const NEWS_LAYOUTS = Object.freeze([
  "editorial-rail",
  "magazine-sections",
  "breaking-ranked",
  "reader-saved",
  "compact-topical",
]);

/** Return the stable Africa/Lagos calendar date for an instant. */
export function lagosCalendarDate(instant = new Date()) {
  const parts = Object.fromEntries(
    LAGOS_DAY_FORMATTER.formatToParts(instant).map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Pure deterministic selector: the same Lagos date always returns the same layout. */
export function selectNewsLayout(lagosDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lagosDate)) throw new TypeError("Expected a YYYY-MM-DD Lagos date");
  const [year, month, day] = lagosDate.split("-").map(Number);
  const utcDay = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
  return NEWS_LAYOUTS[((utcDay % NEWS_LAYOUTS.length) + NEWS_LAYOUTS.length) % NEWS_LAYOUTS.length];
}

export function currentNewsLayout(now = new Date()) {
  return selectNewsLayout(lagosCalendarDate(now));
}
