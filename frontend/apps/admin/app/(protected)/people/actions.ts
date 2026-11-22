"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createStaffClient } from "../../../lib/supabase";
import { mediaExtensionFor, putMediaObject } from "../../../lib/media-r2";
import { adminHref } from "../../../lib/admin-path";

const val = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const uuid = (value: string) => /^[0-9a-f-]{36}$/i.test(value);

function finish(error?: string): never {
  revalidatePath(adminHref("/people"));
  revalidatePath("/who-is-who");
  redirect(adminHref(`/people${error ? `?error=${encodeURIComponent(error)}` : "?updated=1"}`));
}

const PORTRAIT_MAX_BYTES = 10_485_760;

async function uploadPortrait(file: File): Promise<string> {
  if (file.size > PORTRAIT_MAX_BYTES) return "portrait-too-large";
  const extension = mediaExtensionFor(file.type);
  if (!extension) return "portrait-invalid";
  const random = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, "0")).join("");
  const stem = file.name.replace(/\.[^.]*$/, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase().slice(0, 40) || "portrait";
  const objectKey = `media/people/${new Date().getUTCFullYear()}/${random}-${stem}${extension}`;
  const written = await putMediaObject("public", objectKey, await file.arrayBuffer(), file.type);
  return written.state === "ready" ? written.key : "portrait-failed";
}

export async function savePerson(form: FormData): Promise<void> {
  const db = await createStaffClient();
  const id = val(form, "id");
  const name = val(form, "full_name");
  const revision = Number(val(form, "revision"));
  const biography = val(form, "biography");
  const achievements = val(form, "achievements");

  if (name.length < 2 || name.length > 160 || !Number.isSafeInteger(revision)) {
    finish("invalid");
  }

  let portraitKey = val(form, "portrait_key") || null;
  const portraitFile = form.get("portrait_file");
  if (portraitFile instanceof File && portraitFile.size > 0) {
    if ((val(form, "portrait_alt") || "").length < 3) finish("portrait-alt-required");
    const uploaded = await uploadPortrait(portraitFile);
    if (uploaded.startsWith("portrait-")) finish(uploaded);
    portraitKey = uploaded;
  }

  if (id) {
    if (!uuid(id)) finish("invalid");
    const { error } = await db.rpc("people_update", {
      p_person_id: id,
      p_expected_revision: revision,
      p_full_name: name,
      p_preferred_name: val(form, "preferred_name") || null,
      p_community: val(form, "community") || null,
      p_community_note: val(form, "community_note") || null,
      p_biography: biography || null,
      p_is_deceased: form.get("is_deceased") === "on",
      p_portrait_key: portraitKey,
      p_portrait_alt: val(form, "portrait_alt") || null,
      p_portrait_credit: val(form, "portrait_credit") || null,
      p_contributor_name: null,
      p_contributor_consent: false,
    });
    if (error) finish("save-failed");

    const { error: achievementsError } = await db.rpc("people_update_achievements", {
      p_person_id: id,
      p_expected_revision: revision + 1,
      p_achievements: achievements || null,
    });
    if (achievementsError) finish("achievements-failed");
  } else {
    const { data: createdId, error } = await db.rpc("people_create_with_achievements", {
      p_full_name: name,
      p_preferred_name: val(form, "preferred_name") || null,
      p_community: val(form, "community") || null,
      p_community_note: val(form, "community_note") || null,
      p_biography: biography || null,
      p_is_deceased: form.get("is_deceased") === "on",
      p_portrait_key: portraitKey,
      p_portrait_alt: val(form, "portrait_alt") || null,
      p_portrait_credit: val(form, "portrait_credit") || null,
      p_achievements: achievements || null,
    });
    if (error || !createdId) finish("create-failed");
  }

  finish();
}

export async function addSource(form: FormData): Promise<void> {
  const db = await createStaffClient();
  const personId = val(form, "person_id");
  const citation = val(form, "citation");
  const url = val(form, "url");
  if (!uuid(personId) || citation.length < 3 || citation.length > 2000 || (url && !/^https:\/\//.test(url))) {
    finish("invalid");
  }
  const { error } = await db.rpc("people_source_add", {
    p_person_id: personId,
    p_kind: val(form, "kind"),
    p_citation: citation,
    p_url: url || null,
    p_visibility: val(form, "visibility"),
  });
  if (error) finish("source-failed");
  finish();
}

export async function sourceVisibility(form: FormData): Promise<void> {
  const db = await createStaffClient();
  const sourceId = val(form, "source_id");
  const visibility = val(form, "visibility");
  if (!uuid(sourceId) || !["public", "staff"].includes(visibility)) finish("invalid");
  const { error } = await db.rpc("people_source_set_visibility", {
    p_source_id: sourceId,
    p_visibility: visibility,
  });
  if (error) finish("source-failed");
  finish();
}

export async function addOffice(form: FormData): Promise<void> {
  const db = await createStaffClient();
  const personId = val(form, "person_id");
  const sourceId = val(form, "source_id");
  if (!uuid(personId) || (sourceId && !uuid(sourceId))) finish("invalid");
  const { error } = await db.rpc("people_office_add", {
    p_person_id: personId,
    p_title: val(form, "title"),
    p_institution: val(form, "institution"),
    p_term_start: val(form, "term_start") || null,
    p_term_end: val(form, "term_end") || null,
    p_is_current: form.get("is_current") === "on",
    p_source_id: sourceId || null,
  });
  if (error) finish("office-failed");
  finish();
}

export async function changeStatus(form: FormData): Promise<void> {
  const db = await createStaffClient();
  const personId = val(form, "person_id");
  const revision = Number(val(form, "revision"));
  const status = val(form, "status");
  if (!uuid(personId) || !Number.isSafeInteger(revision) || !["draft", "review", "published", "withdrawn"].includes(status)) {
    finish("invalid");
  }
  const { error } = await db.rpc("people_set_status", {
    p_person_id: personId,
    p_status: status,
    p_expected_revision: revision,
  });
  if (error) finish("status-failed");
  finish();
}

export async function verifyPerson(form: FormData): Promise<void> {
  const db = await createStaffClient();
  const personId = val(form, "person_id");
  const sourceId = val(form, "source_id");
  const note = val(form, "note");
  if (!uuid(personId) || !uuid(sourceId) || note.length < 10 || note.length > 2000) finish("invalid");
  const { error } = await db.rpc("people_verify", {
    p_person_id: personId,
    p_source_id: sourceId,
    p_note: note,
  });
  if (error) finish("verification-failed");
  finish();
}

export async function unverifyPerson(form: FormData): Promise<void> {
  const db = await createStaffClient();
  const personId = val(form, "person_id");
  const reason = val(form, "reason");
  if (!uuid(personId) || reason.length < 3 || reason.length > 2000) finish("invalid");
  const { error } = await db.rpc("people_unverify", {
    p_person_id: personId,
    p_reason: reason,
  });
  if (error) finish("verification-failed");
  finish();
}

export async function resolveCorrection(form: FormData): Promise<void> {
  const db = await createStaffClient();
  const correctionId = val(form, "correction_id");
  const state = val(form, "state");
  if (!uuid(correctionId) || !["accepted", "rejected"].includes(state)) finish("invalid");
  const { error } = await db.rpc("people_correction_resolve", {
    p_correction_id: correctionId,
    p_state: state,
  });
  if (error) finish("review-failed");
  finish();
}
