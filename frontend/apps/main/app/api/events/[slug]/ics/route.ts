import { createClient } from "../../../../../lib/supabase";
import { calendarFile, type CalendarEvent } from "../../../../../lib/event-calendar";
import { siteUrl } from "../../../../../lib/site";

export const dynamic = "force-dynamic";

/** /api/events/<slug>/ics — one published event as an .ics file for phone and desktop calendars. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 140) return new Response("Not found", { status: 404 });
  let event: CalendarEvent | null = null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("events")
      .select("id,slug,title,description,venue,starts_at,ends_at")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw error;
    event = (data as CalendarEvent | null) ?? null;
  } catch {
    return new Response("Event temporarily unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!event) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(calendarFile([event], siteUrl, event.title), {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${event.slug.slice(0, 80)}.ics"`,
      "Cache-Control": "public, max-age=0, s-maxage=300",
    },
  });
}
