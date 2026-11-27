import { lagosNow } from "./on-air";
import { foldIcsLine, icsEscape, icsStamp } from "../../../lib/event-calendar";
import { SITE_AUTHOR, CONTACT_EMAIL } from "../../../lib/site-identity";

export type IcsSlot = { id: string; day_of_week: number; starts_at: string; ends_at: string; note: string | null; programme: string | null };

const SECOND = 1000;
const DAY = 86_400 * SECOND;
const WAT_OFFSET = 3600 * SECOND;

function clockSeconds(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]), minutes = Number(match[2]), seconds = Number(match[3] ?? 0);
  if (hours === 24 && minutes === 0 && seconds === 0) return 86_400;
  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

/** RFC 5545 VCALENDAR with one weekly recurring event per valid published slot. */
export function buildIcs(slots: IcsSlot[], now: Date = new Date()): string {
  const stamp = icsStamp(now.toISOString());
  // WAT is UTC+1 year round. Emit UTC timestamps so the time stays correct
  // when imported into calendars configured for a different time zone.
  const lagos = new Date(now.getTime() + WAT_OFFSET);
  const localMidnight = Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), lagos.getUTCDate()) - WAT_OFFSET;
  const { day } = lagosNow(now);
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EPE LAWA//Radio Schedule//EN",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:EPE LAWA Radio Schedule",
    "X-WR-TIMEZONE:Africa/Lagos",
  ];
  for (const slot of slots) {
    const start = clockSeconds(slot.starts_at);
    const end = clockSeconds(slot.ends_at);
    if (!Number.isInteger(slot.day_of_week) || slot.day_of_week < 0 || slot.day_of_week > 6 ||
        start === null || end === null || end <= start) continue;
    const ahead = (slot.day_of_week - day + 7) % 7;
    let midnight = localMidnight + ahead * DAY;
    if (midnight + start * SECOND <= now.getTime()) midnight += 7 * DAY;
    lines.push(
      "BEGIN:VEVENT",
      `UID:radio-${slot.id}@epelawa`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsStamp(new Date(midnight + start * SECOND).toISOString())}`,
      `DTEND:${icsStamp(new Date(midnight + end * SECOND).toISOString())}`,
      "RRULE:FREQ=WEEKLY",
      `ORGANIZER;CN=${icsEscape(SITE_AUTHOR)}:mailto:${CONTACT_EMAIL}`,
      `SUMMARY:${icsEscape(slot.programme ?? "EPE LAWA Radio")}`,
    );
    if (slot.note?.trim()) lines.push(`DESCRIPTION:${icsEscape(slot.note.trim())}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
