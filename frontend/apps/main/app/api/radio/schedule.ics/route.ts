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
      .select("id,day_of_week,starts_at,ends_at,note,programmes(name)")
      .order("day_of_week")
      .order("starts_at")
      .limit(200);
    if (!error) {
      slots = ((data ?? []) as Array<Omit<IcsSlot, "programme"> & { programmes: Array<{ name: string } | undefined> }>).map((slot) => ({
        id: slot.id,
        day_of_week: slot.day_of_week,
        starts_at: slot.starts_at,
        ends_at: slot.ends_at,
        note: slot.note,
        programme: slot.programmes?.[0]?.name ?? null,
      }));
    }
  } catch { slots = []; }

  const body = buildIcs(slots);
  return new Response(body, {
    status: slots.length ? 200 : 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="epe-lawa-radio-schedule.ics"',
      "Cache-Control": "public, max-age=0, s-maxage=300",
    },
  });
}
