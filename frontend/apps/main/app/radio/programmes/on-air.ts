export type ScheduleSlot = { id: string; day_of_week: number; starts_at: string; ends_at: string };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const lagosClockFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Current weekday (0 = Sunday) and minute-of-day in Lagos, regardless of server timezone. */
export function lagosNow(date: Date = new Date()): { day: number; minutes: number } {
  const parts = lagosClockFormatter.formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Sun";
  const hourValue = parts.find((part) => part.type === "hour")?.value ?? "0";
  const minuteValue = parts.find((part) => part.type === "minute")?.value ?? "0";
  const hour = hourValue === "24" ? 0 : Number(hourValue);
  return {
    day: Math.max(0, DAYS.indexOf(weekday)),
    minutes: hour * 60 + Number(minuteValue),
  };
}

export function toMinutes(value: string): number | null {
  // Postgres `time` columns arrive as HH:MM:SS; admin forms submit HH:MM. Accept both.
  const match = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * The scheduled slot on air right now in Lagos, or null.
 * Overnight slots (end before start) run until midnight and are matched.
 */
export function onAirSlotId(slots: ScheduleSlot[], date: Date = new Date()): string | null {
  const { day, minutes } = lagosNow(date);
  for (const slot of slots) {
    if (slot.day_of_week !== day) continue;
    const start = toMinutes(slot.starts_at);
    const end = toMinutes(slot.ends_at);
    if (start === null || end === null) continue;
    const endMinute = end > start ? end : 1440;
    if (minutes >= start && minutes < endMinute) return slot.id;
  }
  return null;
}
