"use server";

import { redirect } from "next/navigation";
import { adminHref } from "../../../lib/admin-path";
import { createStaffClient } from "../../../lib/supabase";

export async function restoreOwnerAuthority(): Promise<void> {
  const db = await createStaffClient();
  let restored: unknown = null;
  try {
    const { data, error } = await db.rpc("staff_owner_authority_restore");
    if (!error) restored = data;
  } catch { /* never disclose provider errors */ }
  redirect(adminHref(`/settings?authority=${restored === null ? "failed" : "restored"}`));
}
