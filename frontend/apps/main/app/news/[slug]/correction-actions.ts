"use server";

import { createClient } from "../../../lib/supabase";
import { formAdminClient, formRateAllowance, formRateLimitedMessage } from "../../../lib/form-server";
import { validateGuestContact } from "../../../lib/public-submitter";

export type CorrectionState = { status: "idle" | "success" | "error"; message: string };

const genericError = "We could not record the correction. Please try again in a moment.";

export async function reportCorrection(_previous: CorrectionState, data: FormData): Promise<CorrectionState> {
  try {
    if (!(await formRateAllowance("article_correction"))) {
      return { status: "error", message: formRateLimitedMessage };
    }
    const articleId = data.get("article_id");
    const reasonRaw = data.get("reason");
    if (typeof articleId !== "string" || !/^[0-9a-f-]{36}$/i.test(articleId)) {
      return { status: "error", message: genericError };
    }
    if (typeof reasonRaw !== "string" || reasonRaw.trim().length < 10 || reasonRaw.trim().length > 2000) {
      return { status: "error", message: "Describe the error in 10 or more characters, up to 2000." };
    }
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: reportId, error } = await supabase.rpc("member_file_correction", {
        p_article_id: articleId,
        p_reason: reasonRaw.trim(),
      });
      if (error || typeof reportId !== "string") return { status: "error", message: genericError };
    } else {
      // Signed-out reader: private name and email, inserted server-side.
      const name = String(data.get("submitter_name") ?? "").trim();
      const email = String(data.get("submitter_email") ?? "").trim().toLowerCase();
      const problem = validateGuestContact(name, email);
      if (problem) return { status: "error", message: problem };
      const db = formAdminClient();
      const { data: article } = await db.from("articles").select("id").eq("id", articleId).maybeSingle();
      if (!article) return { status: "error", message: genericError };
      const { error } = await db.from("article_correction_reports").insert({ article_id: articleId, reporter_id: null, reporter_name: name, reporter_email: email, reason: reasonRaw.trim() });
      if (error) {
        console.error("guest correction insert failed", { code: error.code });
        return { status: "error", message: genericError };
      }
    }
    return { status: "success", message: "Thank you. Your correction report has reached the newsroom desk." };
  } catch {
    return { status: "error", message: genericError };
  }
}
