"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseTourismContribution } from "../../lib/tourism-contribution-input";
import { formAdminClient, formRateAllowance } from "../../lib/form-server";
import { resolvePublicSubmitter } from "../../lib/public-submitter";

const CONSENT_VERSION = "tourism-intake-v1";
const CONSENT_TEXT = "I confirm the information and source details are submitted for private editorial review, and that any media rights basis is accurately described. I consent to review and understand nothing will be published unless provenance and publication rights are verified.";

export async function submitTourismContribution(data: FormData) {
  if (!(await formRateAllowance("tourism_submit"))) redirect(`/tourism?submission=limited#contribute-title`);
  const contribution = parseTourismContribution(data);
  if (!contribution) redirect("/tourism?submission=invalid#contribute-title");

  if (typeof data.get("website") === "string" && String(data.get("website")).trim()) redirect("/tourism?submission=sent#contribute-title");
  const who = await resolvePublicSubmitter(data);
  if (!who.ok) redirect("/tourism?submission=contact#contribute-title");
  const submitter = who.submitter;

  let db;
  try { db = formAdminClient(); } catch { redirect("/tourism?submission=error#contribute-title"); }
  const { error } = await db.from("tourism_submissions").insert({
    contributor_id: submitter.memberId,
    submitter_name: submitter.guest ? submitter.name : null,
    submitter_email: submitter.guest ? submitter.email : null,
    name: contribution.name,
    description: contribution.description,
    visitor_context: contribution.visitorContext || null,
    visit_details: contribution.visitDetails || null,
    source_citation: contribution.sourceCitation,
    source_url: contribution.sourceUrl || null,
    media_url: contribution.mediaUrl || null,
    media_rights: contribution.mediaRights || null,
    consent_version: CONSENT_VERSION,
    consent_text: CONSENT_TEXT,
  });
  if (error) {
    console.error("tourism submission failed", { code: error.code });
    redirect("/tourism?submission=error#contribute-title");
  }

  revalidatePath("/tourism");
  redirect("/tourism?submission=sent#contribute-title");
}
