const publishedDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const isoDayFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function validDate(value: string | null | undefined): Date | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Formats a database timestamp for readers; missing or malformed values stay absent. */
export function formatPublishedDate(value: string | null | undefined): string | null {
  const date = validDate(value);
  return date ? publishedDateFormatter.format(date) : null;
}

/** Formats ISO date or timestamp values without shifting a date-only value across time zones. */
export function formatIsoDay(value: string | null | undefined): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = validDate(dateOnly ? `${value}T00:00:00.000Z` : value);
  return date ? isoDayFormatter.format(date) : null;
}

/** Timestamps shown to readers render in Lagos time, independent of server timezone. */
const lagosStampFormatter = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Lagos",
});

export function formatLagosDateTime(value: string | null | undefined): string | null {
  const date = validDate(value);
  return date ? lagosStampFormatter.format(date) : null;
}
