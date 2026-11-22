"use server";

import { createClient } from "../../lib/supabase";
import { formRateAllowance, formRateLimitedMessage } from "../../lib/form-server";

export type MemberPasswordState = {
  status: "idle" | "success" | "error";
  message: string;
};

function passwordValue(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}

export async function changeMemberPassword(_state: MemberPasswordState, data: FormData): Promise<MemberPasswordState> {
  const currentPassword = passwordValue(data, "currentPassword");
  const newPassword = passwordValue(data, "newPassword");
  const confirmPassword = passwordValue(data, "confirmPassword");
  if (!currentPassword) return { status: "error", message: "Enter your current password to confirm this change." };
  if (newPassword.length < 10 || newPassword.length > 128) {
    return { status: "error", message: "Use a password between 10 and 128 characters." };
  }
  if (newPassword !== confirmPassword) {
    return { status: "error", message: "The new password and its confirmation do not match." };
  }
  if (newPassword === currentPassword) {
    return { status: "error", message: "Choose a password different from your current one." };
  }
  if (!(await formRateAllowance("auth_password_change", 5))) {
    return { status: "error", message: formRateLimitedMessage };
  }
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user || !user.email || !user.email_confirmed_at) {
      return { status: "error", message: "Your verified sign-in is required. Please sign in again." };
    }
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (verifyError) {
      return { status: "error", message: "That current password is not correct. No change was made." };
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      return { status: "error", message: "Your password could not be changed. Please try again later." };
    }
    return {
      status: "success",
      message: "Your password has been changed. Other signed-in devices stay signed in until you sign out everywhere below.",
    };
  } catch {
    return { status: "error", message: "We couldn't complete the password change. Please try again later." };
  }
}
