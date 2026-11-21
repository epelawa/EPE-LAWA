"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { parseTourismContribution } from "../../lib/tourism-contribution-input";
import { formRateAllowance, formRateLimitedMessage } from "../../lib/form-server";

const CONSENT_VERSION = "tourism-intake-v1";
const CONSENT_TEXT = "I confirm the information and source details are submitted for private editorial review, and that any media rights basis is accurately described. I consent to review and understand nothing will be published unless provenance and publication rights are verified.";

export async function submitTourismContribution(data: FormData) {
  if (!(await formRateAllowance("tourism_submit"))) redirect(`/tourism?submission=limited`);
  const contribution = parseTourismContribution(data);
  if (!contribution) redirect("/tourism?submission=invalid");

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=%2Ftourism");

  const { error } = await supabase.from("tourism_submissions").insert({
    contributor_id: user.id,
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
    redirect("/tourism?submission=error");
  }

  revalidatePath("/tourism");
  redirect("/tourism?submission=sent");
}
