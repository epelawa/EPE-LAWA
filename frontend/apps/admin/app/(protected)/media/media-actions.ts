"use server";

import { revalidatePath } from "next/cache";
import { redirect as nextRedirect } from "next/navigation";
import { mediaExtensionFor, deleteMediaObject, putMediaObject } from "../../../lib/media-r2";
import { createClient } from "../../../lib/supabase";
import { adminHref } from "../../../lib/admin-path";

const MAX_BYTES = 26_214_400;

function staffRedirect(result: string): never {
  nextRedirect(adminHref(`/media?result=${result}`));
}

function sanitizeStem(name: string): string {
  const stem = name.replace(/\.[A-Za-z0-9]+$/, "").toLowerCase();
  const cleaned = stem.replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  return cleaned || "media";
}

export async function uploadMedia(form: FormData): Promise<void> {
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "");
  const bucket = String(form.get("bucket") ?? "");
  const title = String(form.get("title") ?? "").trim().slice(0, 300);
  const credit = String(form.get("credit") ?? "").trim().slice(0, 500);
  const rightsNote = String(form.get("rights_note") ?? "").trim().slice(0, 2000);
  const altText = String(form.get("alt_text") ?? "").trim().slice(0, 300);

  if (!(file instanceof File) || file.size === 0) staffRedirect("invalid");
  const mime = file.type.toLowerCase();
  const extension = mediaExtensionFor(mime);
  if (!extension || (kind !== "image" && kind !== "video_thumb" && kind !== "document")) staffRedirect("invalid");
  if (bucket !== "public" && bucket !== "private") staffRedirect("invalid");
  if (file.size > MAX_BYTES) staffRedirect("too_large");
  if (bucket === "public" && kind === "image" && altText.length === 0) staffRedirect("missing_alt");

  const now = new Date();
  const stamp = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const hex = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const objectKey = `media/${stamp}/${hex}-${sanitizeStem(file.name)}${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const stored = await putMediaObject(bucket, objectKey, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), mime);
  if (stored.state === "unconfigured") staffRedirect("unconfigured");
  if (stored.state !== "ready") staffRedirect("storage_failed");
  const written = stored;

  const db = await createClient();
  let saved = false;
  try {
    const { error } = await db.rpc("media_asset_create", {
      p_kind: kind,
      p_title: title,
      p_credit: credit,
      p_rights_note: rightsNote,
      p_bucket: bucket,
      p_object_key: objectKey,
      p_mime_type: mime,
      p_byte_size: written.size,
      p_width: null,
      p_height: null,
      p_alt_text: altText || null,
    });
    saved = !error;
  } catch {
    saved = false;
  }
  if (!saved) staffRedirect("object_saved_record_rejected");
  revalidatePath("/media");
  staffRedirect("uploaded");
}

export async function deleteMedia(form: FormData): Promise<void> {
  const id = String(form.get("id") ?? "");
  const confirmed = form.get("confirm") === "yes";
  if (!/^[0-9a-f-]{36}$/i.test(id) || !confirmed) staffRedirect("invalid");

  const db = await createClient();
  let removal: { bucket: string; object_key: string } | undefined;
  let failed: string | null = null;
  try {
    const { data, error } = await db.rpc("media_asset_delete", { p_asset_id: id });
    if (error) failed = error.message === "media_asset_in_use" ? "in_use" : "failed";
    else removal = Array.isArray(data) ? data[0] : data;
  } catch {
    failed = "unavailable";
  }
  if (failed) staffRedirect(failed);

  let storageRemoved = false;
  if (removal?.object_key) {
    const result = await deleteMediaObject(removal.bucket, removal.object_key);
    storageRemoved = result.state === "ready";
  }
  revalidatePath("/media");
  staffRedirect(storageRemoved ? "deleted" : "record_deleted_object_leftover");
}
