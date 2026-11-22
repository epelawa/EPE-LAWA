"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { createStaffClient } from "../../../lib/supabase";

async function primaryAdmin() {
  const db = await createStaffClient();
  const { data, error } = await db.rpc("staff_roles_authorized");
  if (error || data !== true) throw new Error("Only the verified primary administrator may manage staff.");
  return db;
}
export async function setStaffActive(form: FormData) {
  const db = await primaryAdmin();
  const userId = String(form.get("user_id") ?? "");
  const active = String(form.get("active")) === "true";
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error("Invalid staff account.");
  const { error } = await db.rpc("staff_user_set_active", { p_user_id: userId, p_active: active });
  if (error) throw new Error("Activation change was rejected.");
  revalidatePath("/users");
}
export async function inviteStaff(form: FormData) {
  const db = await primaryAdmin();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error("Enter a valid email address.");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const origin = process.env.ADMIN_ORIGIN;
  if (!url || !key || !origin) throw new Error("Invitations are unavailable: server-only Supabase invite configuration is missing.");
  // No credentials or invitation tokens are logged or returned. The user receives
  // Supabase's invite-only setup link through its configured Auth email provider.
  const { createClient: createAdmin } = await import("@supabase/supabase-js");
  const admin = createAdmin(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", "/auth/new-password?returnTo=staff");
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: callback.toString() });
  if (error || !data.user) throw new Error("The staff invitation could not be sent.");
  const { error: profileError } = await admin.from("staff_profiles").upsert({ user_id: data.user.id, is_active: false }, { onConflict: "user_id" });
  if (profileError) throw new Error("Invitation sent, but staff activation is pending administrator review.");
  revalidatePath("/users");
}
