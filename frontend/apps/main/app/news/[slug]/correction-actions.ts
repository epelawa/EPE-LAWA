"use server";

import { createClient } from "../../../../lib/supabase";
import { formRateAllowance, formRateLimitedMessage } from "../../../../lib/form-server";

export type CorrectionState = { status: "idle" | "success" | "error"; message: string };

const genericError = "We could not record the correction. Please try again in a moment.";

export async function reportCorrection(_previous: CorrectionState, data: FormData): Promise<CorrectionState> {
  try {
    if (!(await formRateAllowance("article_correction"))) {
      return { status: "error", message: formRateLimitedMessage };
    }
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { status: "error", message: "Sign in to suggest a correction." };

    const articleId = data.get("article_id");
    const reasonRaw = data.get("reason");
    if (typeof articleId !== "string" || !/^[0-9a-f-]{36}$/i.test(articleId)) {
      return { status: "error", message: genericError };
    }
    if (typeof reasonRaw !== "string" || reasonRaw.trim().length < 10 || reasonRaw.trim().length > 2000) {
      return { status: "error", message: "Describe the error in 10 or more characters, up to 2000." };
    }

    const { data: reportId, error } = await supabase.rpc("member_file_correction", {
      p_article_id: articleId,
      p_reason: reasonRaw.trim(),
    });
    if (error || typeof reportId !== "string") {
      if (error?.message === "correction_article_unknown") return { status: "error", message: genericError };
      return { status: "error", message: genericError };
    }
    return { status: "success", message: "Thank you. Your correction report has reached the newsroom desk." };
  } catch {
    return { status: "error", message: genericError };
  }
}
