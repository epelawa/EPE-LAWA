"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase";

export type MemberProfileState = {
  status: "idle" | "success" | "error";
  message: string;
};

const RESERVED_HANDLES = new Set([
  "admin", "administrator", "epelawa", "epe", "support", "moderator", "mod",
  "news", "radio", "api", "staff", "system", "help", "info", "contact",
  "official", "root", "security", "editor", "publisher", "deleted",
]);
const genericError = "We couldn’t save your profile. Please try again.";

function text(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function updateMemberProfile(_state: MemberProfileState, data: FormData): Promise<MemberProfileState> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect("/login?next=%2Fdashboard");
    const displayName = text(data, "displayName");
    const handle = text(data, "handle").toLowerCase();
    if (displayName.length < 1 || displayName.length > 60) {
      return { status: "error", message: "Your name must be between 1 and 60 characters." };
    }
    if (!/^[a-z0-9_]{3,24}$/.test(handle)) {
      return { status: "error", message: "Use 3–24 letters, numbers or underscores for your handle." };
    }
    if (RESERVED_HANDLES.has(handle)) {
      return { status: "error", message: "That handle is reserved. Choose another one." };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, handle })
      .eq("user_id", user.id);
    if (error) {
      if (error.code === "23505") return { status: "error", message: "That handle is already in use. Choose another one." };
      return { status: "error", message: genericError };
    }
    revalidatePath("/dashboard");
    return { status: "success", message: "Your profile has been saved." };
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { status: "error", message: genericError };
  }
}

/**
 * Marks the signed-in member's own unread notifications as read.
 * The database policy limits the update to rows owned by the caller and the
 * column grant limits the write to `read_at`.
 */
export async function markNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login?next=%2Fdashboard");
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  revalidatePath("/dashboard");
}
