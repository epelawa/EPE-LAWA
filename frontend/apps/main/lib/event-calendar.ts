/**
 * Calendar helpers for community events: Google Calendar template links and
 * RFC 5545 iCalendar files (Apple Calendar, Outlook, Android calendar apps).
 */
export type CalendarEvent = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  venue: string | null;
  starts_at: string;
  ends_at: string | null;
};

export function icsStamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function icsEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r\n|[\r\n]/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

/** Fold content lines at 75 octets as RFC 5545 §3.1 requires. */
export function foldIcsLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const width = new TextEncoder().encode(char).length;
    if (size + width > (out.length ? 74 : 75)) {
      out.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += width;
  }
  out.push(current);
  return out.join("\r\n ");
}

export function veventLines(event: CalendarEvent, siteUrl: string, now = new Date()): string[] {
  const url = `${siteUrl.replace(/\/$/, "")}/events#event-${event.slug}`;
  return [
    "BEGIN:VEVENT",
    `UID:${event.id}@epelawa`,
    `DTSTAMP:${icsStamp(now.toISOString())}`,
    `DTSTART:${icsStamp(event.starts_at)}`,
    event.ends_at ? `DTEND:${icsStamp(event.ends_at)}` : "",
    `SUMMARY:${icsEscape(event.title)}`,
    event.description ? `DESCRIPTION:${icsEscape(`${event.description.slice(0, 900)}\n\n${url}`)}` : `DESCRIPTION:${icsEscape(url)}`,
    event.venue ? `LOCATION:${icsEscape(event.venue)}` : "",
    `URL:${url}`,
    "END:VEVENT",
  ].filter(Boolean);
}

export function calendarFile(events: CalendarEvent[], siteUrl: string, name = "EPE LAWA Community Events"): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EPE LAWA//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsEscape(name)}`,
    "X-WR-TIMEZONE:Africa/Lagos",
  ];
  const now = new Date();
  for (const event of events) lines.push(...veventLines(event, siteUrl, now));
  lines.push("END:VCALENDAR");
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}

/** Google Calendar "add event" template link. Without an end time Google needs one, so the link uses a one-hour slot and says so in the details. */
export function googleCalendarUrl(event: CalendarEvent, siteUrl: string): string {
  const start = icsStamp(event.starts_at);
  const end = icsStamp(event.ends_at ?? new Date(Date.parse(event.starts_at) + 60 * 60 * 1000).toISOString());
  const url = `${siteUrl.replace(/\/$/, "")}/events#event-${event.slug}`;
  const details = [event.description?.slice(0, 900) ?? "", event.ends_at ? "" : "End time not given by the organiser.", url].filter(Boolean).join("\n\n");
  const params = new URLSearchParams({ action: "TEMPLATE", text: event.title, dates: `${start}/${end}`, details, ctz: "Africa/Lagos" });
  if (event.venue) params.set("location", event.venue);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
