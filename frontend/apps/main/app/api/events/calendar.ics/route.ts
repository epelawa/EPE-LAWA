import { createClient } from "../../../../lib/supabase";
import { calendarFile, type CalendarEvent } from "../../../../lib/event-calendar";
import { siteUrl } from "../../../../lib/site";

export const dynamic = "force-dynamic";

/** /api/events/calendar.ics — all published, upcoming community events. */
export async function GET(): Promise<Response> {
  let events: CalendarEvent[] = [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("events")
      .select("id,slug,title,description,venue,starts_at,ends_at")
      .eq("status", "published")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(500);
    if (error) throw error;
    events = (data ?? []) as CalendarEvent[];
  } catch {
    return new Response("Events temporarily unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  return new Response(calendarFile(events, siteUrl), {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="epe-lawa-community-events.ics"',
      "Cache-Control": "public, max-age=0, s-maxage=300",
    },
  });
}
