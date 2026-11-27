"use server";

import { adminRedirect as redirect } from "../../../lib/admin-redirect";
import { revalidatePath } from "next/cache";
import { createStaffClient } from "../../../lib/supabase";
import { publicMediaUrl } from "../../../../main/lib/media";
import { mediaExtensionFor, putMediaObject } from "../../../lib/media-r2";

const PAGES = new Set(["about", "privacy", "terms", "guidelines"]);
const PHOTO_MAX_BYTES = 10_485_760;
const PHOTO_SLOTS = 3;
const ERRORS: Record<string, string> = {
  not_authenticated: "Your session expired. Sign in again and try again.",
  unknown_page: "That page is not editable.",
  body_too_long: "The text is too long. Keep it within the stated limit.",
  photos_invalid: "One of the photos is missing alt text or credit, or a file type is not supported.",
  revision_conflict: "Someone saved this page while you were editing. Reload, check the current text, then save again.",
  unconfigured: "Image storage is not configured yet, so uploads are unavailable. Link a public HTTPS image instead.",
  too_large: "One of the images is too large. Upload photos smaller than 10 MB.",
  invalid_file: "Only JPEG, PNG, WebP or AVIF images can be uploaded.",
  storage_failed: "The image could not be stored right now. Try again later.",
  failed: "The page could not be saved. Reload and try again.",
};

type PhotoTarget = { url: string; alt: string; credit: string };

function field(form: FormData, name: string, max: number): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function uploadPhoto(file: File): Promise<{ url: string } | { error: string }> {
  if (file.size > PHOTO_MAX_BYTES) return { error: "too_large" };
  const extension = mediaExtensionFor(file.type);
  if (!extension) return { error: "invalid_file" };
  const random = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, "0")).join("");
  const stem = file.name.replace(/\.[^.]*$/, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase().slice(0, 40) || "photo";
  const objectKey = `media/site/${new Date().getUTCFullYear()}/${random}-${stem}${extension}`;
  const publicUrl = publicMediaUrl(objectKey);
  if (!publicUrl) return { error: "unconfigured" };
  const written = await putMediaObject("public", objectKey, await file.arrayBuffer(), file.type);
  if (written.state !== "ready") return { error: "storage_failed" };
  return { url: publicMediaUrl(written.key) ?? publicUrl };
}

export async function saveSitePage(form: FormData) {
  const page = field(form, "page", 20);
  if (!PAGES.has(page)) return await redirect(`/site-pages?status=error&reason=unknown_page`);
  const body = field(form, "body", 50000);
  const revisionRaw = field(form, "revision", 12);
  const revision = Number.parseInt(revisionRaw || "0", 10);
  if (revisionRaw !== "" && !Number.isFinite(revision)) return await redirect(`/site-pages?status=error&reason=failed`);

  const supabase = await createStaffClient();
  const keep: PhotoTarget[] = [];
  const uploads: { file: File; alt: string; credit: string }[] = [];
  for (let slot = 1; slot <= PHOTO_SLOTS; slot += 1) {
    const value = form.get(`photoFile${slot}`);
    const alt = field(form, `photoAlt${slot}`, 500);
    const credit = field(form, `photoCredit${slot}`, 300);
    if (value instanceof File && value.size > 0 && value.name.trim() !== "") {
      if (alt.length < 3) return await redirect(`/site-pages?status=error&reason=photos_invalid`);
      uploads.push({ file: value, alt, credit });
    }
  }
  for (let slot = 1; slot <= 12; slot += 1) {
    const keepFlag = form.get(`photoKeep${slot}`);
    const url = field(form, `photoUrl${slot}`, 2048);
    const alt = field(form, `photoAltKeep${slot}`, 500);
    const credit = field(form, `photoCreditKeep${slot}`, 300);
    if (keepFlag === "on" && url.startsWith("https://") && alt.length >= 3) keep.push({ url, alt, credit });
  }

  const photos: PhotoTarget[] = [...keep];
  for (const upload of uploads) {
    const stored = await uploadPhoto(upload.file);
    if ("error" in stored) return await redirect(`/site-pages?status=error&reason=${stored.error}`);
    photos.push({ url: stored.url, alt: upload.alt, credit: upload.credit });
  }
  if (photos.length > 12) return await redirect(`/site-pages?status=error&reason=photos_invalid`);

  const { data, error } = await supabase.rpc("site_page_save", {
    p_page: page,
    p_body: body,
    p_photos: photos,
    p_revision: revision,
  });

  if (error) {
    const code = typeof error === "object" && error && "message" in error ? String((error as { message?: unknown }).message) : "";
    const reason = code in ERRORS ? code : "failed";
    console.error("site_page_save failed", { page, code: code.slice(0, 80) });
    return await redirect(`/site-pages?status=error&reason=${reason}`);
  }

  revalidatePath("/about");
  revalidatePath("/privacy");
  revalidatePath("/terms");
  revalidatePath("/guidelines");
  return await redirect(`/site-pages?status=saved&rev=${data ?? ""}#page-${page}`);
}
