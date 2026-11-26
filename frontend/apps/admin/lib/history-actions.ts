"use server";

import { revalidatePath } from "next/cache";
import { redirect as nextRedirect } from "next/navigation";
import { createStaffClient } from "./supabase";
import { adminHref } from "./admin-path";

function staffRedirect(path: string): never {
  nextRedirect(adminHref(path));
}

export async function decideHistoryContribution(formData: FormData): Promise<void> {
  const id = formData.get("contributionId");
  const decision = formData.get("decision");
  const publicAccount = formData.get("publicAccount");
  const publicFamilyName = formData.get("publicFamilyName");
  const publicLineageDescription = formData.get("publicLineageDescription");
  const publicCitation = formData.get("publicCitation");
  const publicSourceUrl = formData.get("publicSourceUrl");
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id) ||
      !["needs_revision", "rejected", "published"].includes(String(decision))) {
    staffRedirect("/itan-ilu-mi/review?result=invalid");
  }
  if (decision === "published" && (typeof publicAccount !== "string" || publicAccount.trim().length < 20 || publicAccount.trim().length > 20000)) {
    staffRedirect("/itan-ilu-mi/review?result=missing_public_text");
  }
  if (decision === "published" && (typeof publicCitation !== "string" || publicCitation.trim().length < 3 || publicCitation.trim().length > 1000)) {
    staffRedirect("/itan-ilu-mi/review?result=missing_public_text");
  }
  if ((publicFamilyName !== null && typeof publicFamilyName !== "string") ||
      (typeof publicFamilyName === "string" && publicFamilyName.trim().length > 180) ||
      (publicLineageDescription !== null && typeof publicLineageDescription !== "string") ||
      (typeof publicLineageDescription === "string" && publicLineageDescription.trim().length > 5000) ||
      (publicCitation !== null && typeof publicCitation !== "string") ||
      (typeof publicCitation === "string" && publicCitation.trim().length > 1000) ||
      (publicSourceUrl !== null && typeof publicSourceUrl !== "string") ||
      (typeof publicSourceUrl === "string" && publicSourceUrl.trim().length > 1000) ||
      (typeof publicSourceUrl === "string" && publicSourceUrl.trim() !== "" && !/^https:\/\//i.test(publicSourceUrl.trim()))) {
    staffRedirect("/itan-ilu-mi/review?result=invalid");
  }

  let resultError = false;
  const supabase = await createStaffClient();
  try {
    const capability = await supabase.rpc("has_capability", { p_capability: "history.review" });
    if (capability.error || capability.data !== true) {
      staffRedirect("/itan-ilu-mi/review?result=denied");
    }
    const { error } = await supabase.rpc("history_contribution_decide", {
      p_contribution_id: id,
      p_decision: decision,
      p_public_account: decision === "published" ? (publicAccount as string).trim() : null,
      p_public_family_name: typeof publicFamilyName === "string" && publicFamilyName.trim() ? publicFamilyName.trim() : null,
      p_public_lineage_description: typeof publicLineageDescription === "string" && publicLineageDescription.trim() ? publicLineageDescription.trim() : null,
      p_public_citation: decision === "published" && typeof publicCitation === "string" ? publicCitation.trim() : null,
      p_public_source_url: decision === "published" && typeof publicSourceUrl === "string" && publicSourceUrl.trim() ? publicSourceUrl.trim() : null,
      p_publish_image: decision === "published" && formData.get("publishImage") === "yes",
    });
    resultError = !!error;
    if (error) console.error("history decision failed", { code: error.code });
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    resultError = true;
    console.error("history decision unavailable");
  }

  revalidatePath(adminHref("/itan-ilu-mi/review"));
  revalidatePath("/itan-ilu-mi");
  staffRedirect(`/itan-ilu-mi/review?result=${resultError ? "stale" : "saved"}`);
}

/** Close a public correction/removal request about a published Ìtàn record. */
export async function resolveHistoryCorrection(formData: FormData): Promise<void> {
  const id = String(formData.get("requestId") ?? "");
  const status = String(formData.get("status") ?? "");
  const note = String(formData.get("staffNote") ?? "").trim().slice(0, 2000);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["resolved", "dismissed"].includes(status)) {
    staffRedirect("/itan-ilu-mi/review?result=invalid#corrections");
  }
  let failed = false;
  try {
    const supabase = await createStaffClient();
    const { error } = await supabase.rpc("staff_history_correction_resolve", { p_request_id: id, p_status: status, p_note: note || null });
    failed = !!error;
    if (error) console.error("history correction resolve failed", { code: error.code });
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    failed = true;
  }
  revalidatePath(adminHref("/itan-ilu-mi/review"));
  staffRedirect(`/itan-ilu-mi/review?result=${failed ? "correction_stale" : "correction_saved"}#corrections`);
}
