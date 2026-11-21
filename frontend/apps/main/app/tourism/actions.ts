"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { parseTourismContribution } from "../../lib/tourism-contribution-input";
import { mediaExtensionFor, publicContributedPhotoUrl, putPublicMediaObject } from "../../lib/media-r2";

const CONSENT_VERSION = "tourism-intake-v1";
const CONSENT_TEXT = "I confirm the information and source details are submitted for private editorial review, and that any media rights basis is accurately described. I consent to review and understand nothing will be published unless provenance and publication rights are verified.";
const UPLOAD_MAX_BYTES = 8_388_608;

export async function submitTourismContribution(data: FormData) {
  const contribution = parseTourismContribution(data);
  if (!contribution) redirect("/tourism?submission=invalid");

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=%2Ftourism");

  // Staff-verified JPEG/PNG/WebP photo, already compressed in the browser.
  const rawUpload = data.get("mediaUpload");
  const upload = rawUpload instanceof File && rawUpload.size > 0 && rawUpload.name.trim() !== "" ? rawUpload : null;
  if (upload && contribution.mediaRights.trim().length < 5) redirect("/tourism?submission=invalid");

  let mediaUrl: string | null = contribution.mediaUrl || null;
  if (upload) {
    if (upload.size > UPLOAD_MAX_BYTES) redirect("/tourism?submission=media");
    const extension = mediaExtensionFor(upload.type);
    if (!extension) redirect("/tourism?submission=media");
    const now = new Date();
    const period = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const random = Array.from(crypto.getRandomValues(new Uint8Array(12)), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const stem = (upload.name.replace(/\.[^.]*$/, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase().match(/^[a-z0-9_-]{1,60}/) ?? ["photo"])[0];
    const objectKey = `media/tourism/${period}/${random}-${stem}${extension}`;
    const publicUrl = publicContributedPhotoUrl(objectKey);
    if (!publicUrl) redirect("/tourism?submission=media");
    const written = await putPublicMediaObject(objectKey, await upload.arrayBuffer(), upload.type);
    if (written.state !== "ready") redirect("/tourism?submission=media");
    mediaUrl = publicUrl;
  }

  const { error } = await supabase.from("tourism_submissions").insert({
    contributor_id: user.id,
    name: contribution.name,
    description: contribution.description,
    visitor_context: contribution.visitorContext || null,
    visit_details: contribution.visitDetails || null,
    source_citation: contribution.sourceCitation,
    source_url: contribution.sourceUrl || null,
    media_url: mediaUrl,
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
