"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { storeAvatarDataUrl } from "../../lib/media-r2";

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

export async function updateMemberAvatar(_state: MemberProfileState, data: FormData): Promise<MemberProfileState> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect("/login?next=%2Fdashboard");
    const raw = data.get("avatar_data");
    if (typeof raw !== "string" || !raw.trim().startsWith("data:image/")) {
      return { status: "error", message: "Choose an image before saving." };
    }
    const stored = await storeAvatarDataUrl(raw, "avatar");
    if ("error" in stored) {
      if (stored.error === "unconfigured") return { status: "error", message: "Image storage is not connected on this deployment yet." };
      if (stored.error === "unavailable") return { status: "error", message: "The photo could not be stored right now. Try again in a moment." };
      return { status: "error", message: "That image could not be used. Choose a JPEG, PNG or WebP image smaller than 5 MB." };
    }
    const { error } = await supabase.from("profiles").update({ avatar_key: stored.key }).eq("user_id", user.id);
    if (error) return { status: "error", message: genericError };
    revalidatePath("/dashboard");
    return { status: "success", message: "Your profile photo has been saved." };
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

/**
 * Saves the signed-in member's own notification channel preferences.
 * The row is scoped to the caller's session both by the RLS policy and by
 * always taking user_id from auth, never from the form.
 */
const NOTIFICATION_PREFERENCE_KEYS = [
  "in_app_news", "in_app_radio", "in_app_comments", "in_app_forum",
  "push_news", "push_radio", "push_comments", "push_forum",
] as const;

export async function updateNotificationPreferences(data: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login?next=%2Fdashboard");
  const preferences: Partial<Record<(typeof NOTIFICATION_PREFERENCE_KEYS)[number], boolean>> = {};
  for (const key of NOTIFICATION_PREFERENCE_KEYS) preferences[key] = data.get(key) === "on";
  await supabase
    .from("notification_preferences")
    .upsert({ user_id: user.id, ...preferences });
  revalidatePath("/dashboard");
}
