"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { formRateAllowance, formRateLimitedMessage } from "../../lib/form-server";

const CONSENT_VERSION = "history-intake-v2";
const CONSENT_TEXT = "I confirm this account is submitted for community-history review, that I identified its source and rights basis to the best of my knowledge, and that I consent to staff review and possible publication only after verification. I understand submission does not guarantee publication and may request correction or removal.";
const categories = ["community-history", "family-lineage", "cultural-practice", "place-history", "oral-history", "other"] as const;
function field(formData: FormData, key: string, max: number): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function submitHistoryContribution(formData: FormData) {
  if (!(await formRateAllowance("history_submit"))) redirect(`/itan-ilu-mi?contribution=limited`);
  const title = field(formData, "title", 180);
  const account = field(formData, "account", 20000);
  const sourceDescription = field(formData, "source_description", 2000);
  const sourceUrl = field(formData, "source_url", 1000);
  const category = field(formData, "category", 40);
  const community = field(formData, "community", 120);
  const familyName = field(formData, "family_name", 180);
  const lineageDescription = field(formData, "lineage_description", 5000);
  const rightsDescription = field(formData, "rights_description", 2000);
  if (title.length < 3 || account.length < 20 || sourceDescription.length < 5 || rightsDescription.length < 5 || !categories.includes(category as typeof categories[number]) || (community && community.length < 1) || (familyName && familyName.length < 1)) redirect("/itan-ilu-mi?contribution=invalid");
  if (sourceUrl && (!/^https:\/\//i.test(sourceUrl) || (() => { try { return new URL(sourceUrl).protocol !== "https:"; } catch { return true; } })())) redirect("/itan-ilu-mi?contribution=invalid");
  if (formData.get("consent") !== "yes") redirect("/itan-ilu-mi?contribution=invalid");

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=%2Fitan-ilu-mi");
  const { error } = await supabase.from("history_contributions").insert({
    contributor_id: user.id, title, account, source_description: sourceDescription,
    source_url: sourceUrl || null, category, community: community || null,
    family_name: familyName || null, lineage_description: lineageDescription || null,
    rights_description: rightsDescription, consent_version: CONSENT_VERSION, consent_text: CONSENT_TEXT,
  });
  if (error) {
    console.error("history contribution intake failed", { code: error.code });
    redirect("/itan-ilu-mi?contribution=error");
  }
  revalidatePath("/itan-ilu-mi");
  redirect("/itan-ilu-mi?contribution=sent");
}
