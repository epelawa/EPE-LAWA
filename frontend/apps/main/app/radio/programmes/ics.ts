import { lagosNow } from "./on-air";

export type IcsSlot = { id: string; day_of_week: number; starts_at: string; ends_at: string; note: string | null; programme: string | null };

const escapeIcsText = (value: string): string =>
  value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

const pad = (value: number): string => String(value).padStart(2, "0");

const lagosDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Lagos",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function validClock(value: string): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${pad(hours)}${pad(minutes)}00`;
}

const elapsedDays = (from: Date, days: number): Date => new Date(from.getTime() + days * 86_400_000);

/** Next calendar occurrence (floating local Lagos time, `YYYYMMDDTHHMMSS`) for a weekly slot. */
export function nextOccurrence(dayOfWeek: number, clock: string, now: Date = new Date()): string | null {
  const startClock = validClock(clock);
  if (!startClock || dayOfWeek < 0 || dayOfWeek > 6) return null;
  const today = lagosDayFormatter.format(now);
  const [, month, day] = today.split("-").map(Number);
  const year = Number(today.slice(0, 4));
  const midnightUtc = Date.UTC(year, month - 1, day);
  const { day: todayDay, minutes: nowMinutes } = lagosNow(now);
  const startMinutes = Number(startClock.slice(0, 2)) * 60 + Number(startClock.slice(2, 4));
  let ahead = (dayOfWeek - todayDay + 7) % 7;
  if (ahead === 0 && nowMinutes >= startMinutes) ahead = 7;
  const occurrence = elapsedDays(new Date(midnightUtc), ahead);
  return `${occurrence.getUTCFullYear()}${pad(occurrence.getUTCMonth() + 1)}${pad(occurrence.getUTCDate())}T${startClock}`;
}

const endClock = (start: string, end: string): string | null => {
  const startMatch = /^(\d{1,2}):(\d{2})$/.exec(start.trim());
  const endMatch = /^(\d{1,2}):(\d{2})$/.exec(end.trim());
  if (!startMatch || !endMatch) return null;
  const startMinutes = Number(startMatch[1]) * 60 + Number(startMatch[2]);
  const endMinutesRaw = Number(endMatch[1]) * 60 + Number(endMatch[2]);
  const endMinutes = endMinutesRaw > startMinutes ? endMinutesRaw : Math.min(1440, startMinutes + 120);
  return `${pad(Math.floor(endMinutes / 60) % 24)}${pad(endMinutes % 60)}00`;
};

/** RFC 5545 VCALENDAR with one weekly recurring event per published slot. */
export function buildIcs(slots: IcsSlot[], now: Date = new Date()): string {
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EPE LAWA//Radio Schedule//EN",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:EPE LAWA Radio Schedule",
    "X-WR-TIMEZONE:Africa/Lagos",
  ];
  for (const slot of slots) {
    const summary = slot.programme ?? "EPE LAWA Radio";
    const start = nextOccurrence(slot.day_of_week, slot.starts_at, now);
    const end = endClock(slot.starts_at, slot.ends_at);
    if (!start || !end) continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:radio-${slot.id}@epelawa`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      "RRULE:FREQ=WEEKLY",
      `SUMMARY:${escapeIcsText(summary)}`,
    );
    if (slot.note?.trim()) lines.push(`DESCRIPTION:${escapeIcsText(slot.note.trim())}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map((line) => (line.length > 74 ? line.match(/.{1,74}/g)!.join("\r\n ") : line)).join("\r\n") + "\r\n";
}
