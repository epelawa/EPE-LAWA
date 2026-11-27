"use server";

import { revalidatePath } from "next/cache";
import { adminRedirect as redirect } from "../../../lib/admin-redirect";
import { adminHref } from "../../../lib/admin-path";
import { createStaffClient } from "../../../lib/supabase";

const UUID_RE = /^[0-9a-f-]{36}$/i;

async function finish(status: "assigned" | "removed" | "denied" | "invalid" | "failed" | "partial"): Promise<never> {
  revalidatePath(adminHref("/ads"));
  revalidatePath("/");
  revalidatePath("/business-directory");
  return await redirect(adminHref(`/ads?ads=${status}`));
}

export async function assignAds(form: FormData): Promise<void> {
  const ids = form.getAll("featured").filter((v): v is string => typeof v === "string" && UUID_RE.test(v)).slice(0, 12);
  if (ids.length === 0) return await finish("invalid");
  let assigned = 0;
  let failure = false;
  const db = await createStaffClient();
  try {
    for (const [index, id] of ids.entries()) {
      const { error } = await db.rpc("business_ad_assign", { p_business_id: id, p_position: index, p_active: true });
      if (!error) assigned += 1;
      else failure = true;
    }
  } catch {
    return await finish("failed");
  }
  if (!failure && assigned === ids.length) return await finish("assigned");
  if (assigned > 0) return await finish("partial");
  return await finish("denied");
}

export async function updateAdSlot(form: FormData): Promise<void> {
  const businessId = form.get("business_id");
  const position = Number(form.get("position"));
  const active = form.get("is_active") === "on";
  if (typeof businessId !== "string" || !UUID_RE.test(businessId) || !Number.isSafeInteger(position) || position < 0 || position > 999) return await finish("invalid");
  let error: boolean;
  const db = await createStaffClient();
  try {
    const written = await db.rpc("business_ad_assign", { p_business_id: businessId, p_position: position, p_active: active });
    error = Boolean(written.error);
  } catch {
    return await finish("failed");
  }
  return await finish(error ? "denied" : "assigned");
}

export async function removeAd(form: FormData): Promise<void> {
  const slotId = form.get("slot_id");
  if (typeof slotId !== "string" || !UUID_RE.test(slotId)) return await finish("invalid");
  let error: boolean;
  const db = await createStaffClient();
  try {
    const written = await db.rpc("business_ad_remove", { p_slot_id: slotId });
    error = Boolean(written.error);
  } catch {
    return await finish("failed");
  }
  return await finish(error ? "denied" : "removed");
}
