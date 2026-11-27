import { PUBLIC_SCHEDULE_COLUMNS, publicScheduleSlot } from "../../../../lib/radio-schedule";
import { createClient } from "../../../../lib/supabase";
import { buildIcs, type IcsSlot } from "../../../radio/programmes/ics";

export const dynamic = "force-dynamic";

/** /api/radio/schedule.ics — weekly recurring calendar of the published radio schedule. */
export async function GET(): Promise<Response> {
  let slots: IcsSlot[] = [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("radio_schedule")
      .select(PUBLIC_SCHEDULE_COLUMNS).eq("publication_status", "published").eq("programmes.publication_status", "published").eq("programmes.is_active", true)
      .order("day_of_week")
      .order("starts_at")
      .limit(200);
    if (error) throw error;
    slots = (data ?? []).map(publicScheduleSlot);
  } catch {
    return new Response("Schedule temporarily unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const body = buildIcs(slots);
  return new Response(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="epe-lawa-radio-schedule.ics"',
      "Cache-Control": "public, max-age=0, s-maxage=300",
    },
  });
}
