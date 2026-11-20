"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { adminHref } from "../../../lib/admin-path";

function isoFromForm(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  const date = new Date(text);
  if (!text || Number.isNaN(date.getTime())) throw new Error("invalid_date");
  return date.toISOString();
}

export async function createPlacement(form: FormData) {
  const db = await createClient();
  const businessId = String(form.get("business_id") ?? "").trim();
  let result = "invalid";
  try {
    if (!businessId) throw new Error("required");
    const { error } = await db.rpc("business_featured_save", {
      p_business_id: businessId,
      p_starts_at: isoFromForm(form.get("starts_at")),
      p_ends_at: isoFromForm(form.get("ends_at")),
    });
    if (error) throw error;
    result = "created";
  } catch (error) {
    console.error("advertising placement create failed", {
      code: error instanceof Error ? error.message : "unknown",
    });
    result = "failed";
  }
  revalidatePath(adminHref("/advertising"));
  redirect(adminHref(`/advertising?result=${result}`));
}

export async function endPlacement(form: FormData) {
  const db = await createClient();
  const id = String(form.get("placement_id") ?? "").trim();
  let result = "invalid";
  try {
    if (!id) throw new Error("required");
    const { error } = await db.rpc("business_featured_end", {
      p_placement_id: id,
    });
    if (error) throw error;
    result = "ended";
  } catch (error) {
    console.error("advertising placement end failed", {
      code: error instanceof Error ? error.message : "unknown",
    });
    result = "failed";
  }
  revalidatePath(adminHref("/advertising"));
  redirect(adminHref(`/advertising?result=${result}`));
}
