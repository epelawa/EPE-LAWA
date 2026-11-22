import { createClient } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";

function stamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

/** /api/events/calendar.ics — all published, upcoming community events. */
export async function GET(): Promise<Response> {
  type EventRow = { id: string; slug: string; title: string; description: string | null; venue: string | null; starts_at: string; ends_at: string | null };
  let events: EventRow[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("events")
      .select("id,slug,title,description,venue,starts_at,ends_at")
      .eq("status", "published")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(500);
    events = (data ?? []) as EventRow[];
  } catch { events = []; }

  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EPE LAWA//Events//EN", "X-WR-CALNAME:EPE LAWA Community Events"];
  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@epelawa`,
      `SUMMARY:${escape(event.title)}`,
      event.description ? `DESCRIPTION:${escape(event.description.slice(0, 500))}` : "DESCRIPTION:",
      event.venue ? `LOCATION:${escape(event.venue)}` : "LOCATION:",
      `DTSTART:${stamp(event.starts_at)}`,
      event.ends_at ? `DTEND:${stamp(event.ends_at)}` : "",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");

  return new Response(lines.filter(Boolean).join("\r\n"), {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="epe-lawa-community-events.ics"',
      "Cache-Control": "public, max-age=0, s-maxage=300",
    },
  });
}
