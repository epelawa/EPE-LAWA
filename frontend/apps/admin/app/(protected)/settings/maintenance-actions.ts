"use server";
import "server-only";
import { redirect } from "next/navigation";
import { adminHref } from "../../../lib/admin-path";
import { createClient } from "../../../lib/supabase";
export async function setMaintenance(form: FormData) {
  const desired = form.get("enabled"), rawRevision = form.get("revision");
  if (process.env.MAINTENANCE_GATE_ENABLED !== "true" || (desired !== "true" && desired !== "false") || typeof rawRevision !== "string" || !/^[1-9]\d{0,14}$/.test(rawRevision)) redirect(adminHref("/settings?maintenance=unavailable"));
  let success = false;
  try {
    const db = await createClient();
    const {error} = await db.rpc("maintenance_set", {p_enabled:desired === "true",p_revision:Number(rawRevision)});
    success = !error;
  } catch { /* never disclose provider errors */ }
  redirect(adminHref(`/settings?maintenance=${success ? "saved" : "failed"}`));
}
