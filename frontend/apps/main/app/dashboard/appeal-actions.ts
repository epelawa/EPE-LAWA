"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase";
import { formRateAllowance, formRateMessage } from "../../lib/form-server";

export type MemberAppealState = {
  status: "idle" | "success" | "error";
  message: string;
};

const UUID = /^[0-9a-f-]{36}$/i;

function statementValue(data: FormData): string {
  const value = data.get("statement");
  return typeof value === "string" ? value.trim() : "";
}

export async function submitBanAppeal(_state: MemberAppealState, data: FormData): Promise<MemberAppealState> {
  const banId = typeof data.get("banId") === "string" ? String(data.get("banId")).trim() : "";
  const statement = statementValue(data);
  if (!UUID.test(banId)) {
    return { status: "error", message: "This ban record could not be identified. Refresh the page and try again." };
  }
  if (statement.length < 10 || statement.length > 2000) {
    return { status: "error", message: "Give your appeal in 10 to 2000 characters." };
  }
  if (!(await formRateAllowance("moderation_appeal", 5))) {
    return { status: "error", message: await formRateMessage() };
  }
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user || !user.email_confirmed_at) {
      return { status: "error", message: "Your verified sign-in is required. Please sign in again." };
    }
    const { error } = await supabase.rpc("member_appeal_moderation", {
      p_resource_type: "member_ban",
      p_action_id: banId,
      p_statement: statement,
    });
    if (error) {
      const code = error.code ?? "";
      const text = error.message ?? "";
      if (code === "23505" || text.includes("duplicate key")) {
        return { status: "error", message: "An appeal for this ban has already been opened. Staff will answer it there." };
      }
      if (code === "42501" || text.includes("appeal_forbidden")) {
        return { status: "error", message: "Your verified sign-in is required. Please sign in again." };
      }
      if (code === "22023" || text.includes("appeal_fields_invalid")) {
        return { status: "error", message: "The appeal statement was not accepted. Check its length and try again." };
      }
      return { status: "error", message: "The appeal could not be submitted right now. Nothing was sent; please try again later." };
    }
    revalidatePath("/dashboard");
    return { status: "success", message: "Your appeal has been submitted. A moderation decision will appear in this panel and in your notifications." };
  } catch {
    return { status: "error", message: "We couldn't reach the account service. The appeal was not submitted; please try again later." };
  }
}
