import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { rpcProblem, type RunLog } from "../activity";

/**
 * Ads "once approved": the AI only places businesses whose sponsorship was
 * paid and verified by staff (active_business_sponsorships). It adds them to
 * the ad carousel, rotates their order daily so every sponsor gets the front
 * slot in turn, and removes slots it created once a sponsorship ends. Slots
 * placed by a human are never moved or removed.
 */
export async function runAdsJob(db: SupabaseClient, ctx: { log: RunLog; actorId: string; publish: boolean }): Promise<string> {
  const [sponsorships, slots] = await Promise.all([
    db.from("active_business_sponsorships").select("business_id,ends_at"),
    db.from("business_ad_slots").select("id,business_id,position,is_active,created_by"),
  ]);
  if (sponsorships.error || slots.error) return "Ad data could not be read.";
  const sponsored = new Map((sponsorships.data ?? []).map((row) => [String(row.business_id), String(row.ends_at)]));
  const allSlots = slots.data ?? [];
  const mine = allSlots.filter((slot) => slot.created_by === ctx.actorId);
  const slotted = new Set(allSlots.map((slot) => String(slot.business_id)));
  const ids = [...new Set([...sponsored.keys(), ...mine.map((slot) => String(slot.business_id))])];
  const names = new Map<string, { name: string; status: string }>();
  if (ids.length) {
    const { data } = await db.from("businesses").select("id,name,status,deleted_at").in("id", ids);
    for (const row of data ?? []) if (!row.deleted_at) names.set(String(row.id), { name: String(row.name), status: String(row.status) });
  }
  let changes = 0;

  for (const slot of mine) {
    const id = String(slot.business_id);
    if (sponsored.has(id) && names.get(id)?.status === "published") continue;
    const label = names.get(id)?.name ?? "a business";
    if (!ctx.publish) {
      await ctx.log.record({ job: "ads", action: "ads.remove", outcome: "escalated", title: `Remove ad for ${label}?`, reason: "Its paid sponsorship has ended or the listing is no longer published. Autopilot is off, so a human should remove it.", resourceType: "business", resourceId: id });
      continue;
    }
    const removed = await db.rpc("ai_ad_remove", { p_slot_id: slot.id });
    changes += 1;
    await ctx.log.record({ job: "ads", action: "ads.remove", outcome: removed.error ? "failed" : "done", title: `Removed ad for ${label}`, reason: removed.error ? rpcProblem(removed.error) : "Its paid sponsorship ended or the listing is no longer published.", resourceType: "business", resourceId: id });
  }

  const eligible = [...sponsored.keys()].filter((id) => names.get(id)?.status === "published");
  for (const id of eligible) {
    if (slotted.has(id)) continue;
    const label = names.get(id)!.name;
    if (!ctx.publish) {
      await ctx.log.record({ job: "ads", action: "ads.assign", outcome: "escalated", title: `Place ad for ${label}?`, reason: `Approved paid sponsorship until ${sponsored.get(id)}. Autopilot is off, so a human should place it.`, resourceType: "business", resourceId: id });
      continue;
    }
    const position = allSlots.length + changes;
    const added = await db.rpc("ai_ad_assign", { p_business_id: id, p_position: Math.min(999, position) });
    changes += 1;
    await ctx.log.record({ job: "ads", action: "ads.assign", outcome: added.error ? "failed" : "done", title: `Placed ad for ${label}`, reason: added.error ? rpcProblem(added.error) : `Approved paid sponsorship running until ${sponsored.get(id)}.`, resourceType: "business", resourceId: id });
  }

  // Daily fair rotation of the AI-managed sponsor slots (front slot moves to the back).
  const rotating = mine.filter((slot) => slot.is_active && sponsored.has(String(slot.business_id))).sort((a, b) => a.position - b.position);
  if (ctx.publish && rotating.length > 1) {
    const positions = rotating.map((slot) => slot.position);
    const order = [...rotating.slice(1), rotating[0]];
    for (let index = 0; index < order.length; index += 1) {
      await db.rpc("ai_ad_assign", { p_business_id: order[index].business_id, p_position: positions[index] });
    }
    changes += 1;
    await ctx.log.record({ job: "ads", action: "ads.rotate", outcome: "done", title: `Rotated ${rotating.length} sponsor ads`, reason: `Daily rotation so each approved sponsor takes the front slot in turn. New front: ${names.get(String(order[0].business_id))?.name ?? "sponsor"}.` });
  }
  if (!changes && !eligible.length) {
    await ctx.log.record({ job: "ads", action: "ads.check", outcome: "skipped", title: "No approved sponsorship to place", reason: "No business has an active, paid and verified sponsorship, so the ad carousel was left as staff arranged it." });
  }
  return `${changes} ad change${changes === 1 ? "" : "s"}.`;
}
