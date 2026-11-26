"use server";

import { revalidatePath } from "next/cache";
import { formAdminClient, formRateAllowance, formRateMessage } from "../../lib/form-server";
import { humanCheckFailedMessage, verifyHumanCheck } from "../../lib/human-check";
import { resolvePublicSubmitter, validateGuestContact } from "../../lib/public-submitter";
import { storeSubmissionImage } from "../../lib/media-r2";
import { authMailConfig, deliverAuthMessage } from "../../lib/auth-mail-hook";
import { HISTORY_CATEGORIES, HISTORY_CONSENT_TEXT } from "./history-categories";

const CONSENT_VERSION = "history-intake-v2";

export type HistoryFormState = { status: "idle" | "error" | "success"; message: string; field?: string };

function field(formData: FormData, key: string, max: number): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
const fail = (message: string, field?: string): HistoryFormState => ({ status: "error", message, field });
const isHttps = (value: string) => { try { return new URL(value).protocol === "https:"; } catch { return false; } };

/**
 * Ìtàn Ilú Mi contribution. Signed-in members are linked to their profile;
 * anyone else leaves a name and email. Rows go to `history_contributions`
 * (status pending), which the staff Ìtàn Ilú Mi review page reads.
 */
export async function submitHistoryContribution(_prev: HistoryFormState, formData: FormData): Promise<HistoryFormState> {
  if (field(formData, "website", 200)) return { status: "success", message: "Your account was received privately for review." };
  const title = field(formData, "title", 180);
  const account = field(formData, "account", 20000);
  const sourceDescription = field(formData, "source_description", 2000);
  const sourceUrl = field(formData, "source_url", 1000);
  const category = field(formData, "category", 40);
  const community = field(formData, "community", 120);
  const familyName = field(formData, "family_name", 180);
  const lineageDescription = field(formData, "lineage_description", 5000);
  const rightsDescription = field(formData, "rights_description", 2000);
  if (title.length < 3) return fail("Give your account a title of at least 3 characters.", "title");
  if (account.length < 20) return fail("Write at least 20 characters for your account.", "account");
  if (!HISTORY_CATEGORIES.includes(category as typeof HISTORY_CATEGORIES[number])) return fail("Choose a category.", "category");
  if (sourceDescription.length < 5) return fail("Tell us the source or basis for the account (at least 5 characters).", "source_description");
  if (sourceUrl && !isHttps(sourceUrl)) return fail("The source link must start with https://.", "source_url");
  if (rightsDescription.length < 5) return fail("Describe your publication rights or permission (at least 5 characters).", "rights_description");
  if (formData.get("consent") !== "yes") return fail("Tick the consent box to send your account for review.", "consent");

  const who = await resolvePublicSubmitter(formData);
  if (!who.ok) return fail(who.message, "submitter_email");
  const submitter = who.submitter;
  if (submitter.guest) {
    const problem = validateGuestContact(submitter.name ?? "", submitter.email ?? "");
    if (problem) return fail(problem, "submitter_email");
  }

  if ((await verifyHumanCheck(formData)) === "fail") return fail(humanCheckFailedMessage);
  if (!(await formRateAllowance("history_submit"))) return fail(await formRateMessage());
  let db;
  try { db = formAdminClient(); } catch { return fail("Submissions are temporarily unavailable. Nothing was saved — please try again shortly."); }

  const image = await storeSubmissionImage(formData, "history", title);
  const { data, error } = await db.from("history_contributions").insert({
    contributor_id: submitter.memberId,
    submitter_name: submitter.guest ? submitter.name : null,
    submitter_email: submitter.guest ? submitter.email : null,
    title, account, source_description: sourceDescription,
    source_url: sourceUrl || null, category, community: community || null,
    family_name: familyName || null, lineage_description: lineageDescription || null,
    rights_description: rightsDescription, consent_version: CONSENT_VERSION, consent_text: HISTORY_CONSENT_TEXT,
    image_key: image.state === "stored" ? image.key : null,
    image_alt: image.state === "stored" ? image.alt : null,
  }).select("id").single();
  if (error || !data?.id) {
    console.error("history contribution intake failed", { code: error?.code });
    return fail("Your account could not be saved. Check the fields and try again — nothing was published.");
  }

  try {
    const config = authMailConfig(process.env);
    if (config.kind === "gmail") {
      await deliverAuthMessage({ to: config.user, subject: "New Ìtàn Ilú Mi contribution", text: "A community-history account is awaiting review on the Ìtàn Ilú Mi review page of the staff workspace.", html: "<p>A community-history account is awaiting review on the Ìtàn Ilú Mi review page of the staff workspace.</p>", idempotencyKey: `history-notice/${data.id}` }, config);
      if (submitter.email) await deliverAuthMessage({ to: submitter.email, subject: "We received your Ìtàn Ilú Mi account", text: "Thank you for contributing to Ìtàn Ilú Mi. Your account is private until our team has reviewed and verified it.", html: "<p>Thank you for contributing to Ìtàn Ilú Mi. Your account is private until our team has reviewed and verified it.</p>", idempotencyKey: `history-ack/${data.id}` }, config);
    }
  } catch {
    console.error("history contribution mail unavailable; check the review queue.");
  }
  try { revalidatePath("/itan-ilu-mi"); } catch { /* best effort */ }
  const base = "Your account was received privately for review. Submission does not mean it has been approved or published.";
  return { status: "success", message: image.state === "failed" ? `${base} ${image.message}` : base };
}
