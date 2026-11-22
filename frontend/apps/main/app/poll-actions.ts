"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../lib/supabase";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function pollVote(formData: FormData): Promise<void> {
  const optionId = typeof formData.get("option_id") === "string" ? (formData.get("option_id") as string).trim() : "";
  if (!UUID.test(optionId)) return;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return;
  const { error } = await db.rpc("site_poll_vote", { p_option_id: optionId });
  if (error) {
    console.error("site poll vote failed", { code: error.code });
    return;
  }
  revalidatePath("/");
}
