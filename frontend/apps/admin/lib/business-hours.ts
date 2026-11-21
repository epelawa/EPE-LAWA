export type BusinessHours = Record<string, string>;

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
const LABELS: Record<string, string> = {
  sunday: "Sunday", monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday", saturday: "Saturday",
};

const RANGE = /^(\d{1,2}):(\d{2})\s*[-\u2013\u2014]\s*(\d{1,2}):(\d{2})$/;

function minutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

/** Keeps only valid `HH:MM–HH:MM` entries on real day names; malformed values are dropped, not guessed. */
export function parseBusinessHours(value: unknown): BusinessHours {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: BusinessHours = {};
  for (const [rawDay, rawRange] of Object.entries(value as Record<string, unknown>)) {
    const day = rawDay.toLowerCase();
    if (!(DAYS as readonly string[]).includes(day) || typeof rawRange !== "string") continue;
    const match = RANGE.exec(rawRange.trim());
    if (!match) continue;
    const [h1, m1, h2, m2] = [match[1], match[2], match[3], match[4]].map(Number);
    if ([h1, m1, h2, m2].some((part) => Number.isNaN(part))) continue;
    if (h1 > 23 || m1 > 59 || h2 > 23 || m2 > 59) continue;
    out[day] = `${String(h1).padStart(2, "0")}:${String(m1).padStart(2, "0")}\u2013${String(h2).padStart(2, "0")}:${String(m2).padStart(2, "0")}`;
  }
  return out;
}

/** All seven days in week order, with the open range or null when closed. */
export function hourRows(hours: BusinessHours): Array<{ day: string; label: string; range: string | null }> {
  return DAYS.map((day) => ({ day, label: LABELS[day], range: hours[day] ?? null }));
}

const lagosClockFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos",
  weekday: "long",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Whether the business is open right now in Lagos; null when no usable hours are on record. */
export function businessOpenNow(hours: BusinessHours, date: Date = new Date()): boolean | null {
  const entry = Object.keys(hours).length ? true : null;
  if (!entry) return null;
  const parts = lagosClockFormatter.formatToParts(date);
  const weekday = (parts.find((part) => part.type === "weekday")?.value ?? "Sunday").toLowerCase();
  const hourValue = parts.find((part) => part.type === "hour")?.value ?? "0";
  const now = (hourValue === "24" ? 0 : Number(hourValue)) * 60 + Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const range = hours[weekday];
  if (!range) return false;
  const [start, end] = range.split("\u2013").map(minutes);
  if (end > start) return now >= start && now < end;
  return now >= start || now < end;
}
