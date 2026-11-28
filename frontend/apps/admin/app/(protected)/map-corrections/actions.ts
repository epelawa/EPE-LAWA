"use server";
import { revalidatePath } from "next/cache";
import { adminRedirect as redirect } from "../../../lib/admin-redirect";
import { adminHref } from "../../../lib/admin-path";
import { createStaffClient } from "../../../lib/supabase";
const val = (form: FormData, key: string, max: number) => { const v = form.get(key); return typeof v === "string" ? v.trim().slice(0, max) : ""; };
export async function decideMapCorrection(form: FormData): Promise<void> {
  const id = val(form, "submission_id", 36), decision = val(form, "decision", 16);
  const supabase = await createStaffClient();
  const cap = await supabase.rpc("has_capability", { p_capability: "map.review" });
  if (cap.error || cap.data !== true) return await redirect(adminHref("/map-corrections?result=denied"));
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["approve", "reject"].includes(decision)) return await redirect(adminHref("/map-corrections?result=invalid"));
  const lat = val(form, "latitude", 32), lon = val(form, "longitude", 32);
  const result = await supabase.rpc("map_correction_decide", {
    p_submission_id: id, p_decision: decision, p_place_name: val(form, "place_name", 180),
    p_details: val(form, "details", 4000), p_directions_query: val(form, "directions_query", 500),
    p_latitude: lat ? Number(lat) : null, p_longitude: lon ? Number(lon) : null,
    p_source_note: val(form, "source_note", 1200), p_source_url: val(form, "source_url", 2000),
  });
  revalidatePath(adminHref("/map-corrections"));
  revalidatePath("/map");
  return await redirect(adminHref(`/map-corrections?result=${result.error ? "stale" : "saved"}`));
}
