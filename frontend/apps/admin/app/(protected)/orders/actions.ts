"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminHref } from "../../../lib/admin-path";
import { createClient } from "../../../lib/supabase";

export async function advanceOrder(formData: FormData): Promise<void> {
  const id = String(formData.get("order_id") ?? "").trim();
  const status = String(formData.get("status") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["preparing", "out_for_delivery", "delivered", "cancelled"].includes(status)) {
    redirect(adminHref("/orders?result=invalid"));
  }

  const db = await createClient();
  const capability = await db.rpc("has_capability", { p_capability: "order.manage" });
  if (capability.error || capability.data !== true) redirect(adminHref("/orders?result=denied"));
  const { error } = await db.rpc("order_advance", { p_order_id: id, p_status: status, p_note: note || null });
  if (error) {
    console.error("order advance failed", { code: error.code });
    redirect(adminHref("/orders?result=failed"));
  }
  revalidatePath(adminHref("/orders"));
  redirect(adminHref("/orders?result=saved"));
}
