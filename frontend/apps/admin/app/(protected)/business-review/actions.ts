"use server";

import { revalidatePath } from "next/cache";
import { adminRedirect as redirect } from "../../../lib/admin-redirect";
import { adminHref } from "../../../lib/admin-path";
import { createStaffClient } from "../../../lib/supabase";
import { mediaExtensionFor, putMediaObject } from "../../../lib/media-r2";
import { parseBusinessHours } from "../../../lib/business-hours";

const value = (form: FormData, key: string) => {
  const raw = form.get(key);
  return typeof raw === "string" ? raw.trim() : "";
};

export async function reviewBusiness(formData: FormData): Promise<void> {
  const db = await createStaffClient();
  const id = value(formData, "business_id");
  const status = value(formData, "status");
  const note = value(formData, "note");
  const evidence = value(formData, "evidence");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["reviewing", "published", "rejected"].includes(status) || note.length < 5 || note.length > 1000 || (status === "published" && (evidence.length < 10 || evidence.length > 2000))) {
    return await redirect(adminHref("/business-review?error=invalid"));
  }
  const { error } = await db.rpc("business_review_decide", { p_business_id:id, p_status:status, p_note:note, p_evidence:evidence || null });
  if (error) return await redirect(adminHref("/business-review?error=action-failed"));
  revalidatePath(adminHref("/business-review"));
  revalidatePath("/business-directory");
  return await redirect(adminHref("/business-review?updated=1"));
}

const UUID_RE = /^[0-9a-f-]{36}$/i;
export type StaffCreateState = { status: "idle" | "success" | "error"; message: string };

export async function staffCreateBusiness(_prev: StaffCreateState, formData: FormData): Promise<StaffCreateState> {
  const db = await createStaffClient();
  
  // Check business.review capability
  const { data: hasCapability } = await db.rpc("has_capability", { p_capability: "business.review" });
  if (hasCapability !== true) {
    return { status: "error", message: "You need business.review access to create listings. Contact an administrator." };
  }
  
  const field = (key: string) => { const raw = formData.get(key); return typeof raw === "string" ? raw.trim() : ""; };
  const name = field("name");
  const categoryId = field("category_id");
  const description = field("description");
  const area = field("area");
  const address = field("address");
  const landmark = field("landmark");
  const phone = field("phone");
  const whatsapp = field("whatsapp");
  const email = field("email");
  const website = field("website");
  const verify = formData.get("verify") === "on";
  const evidence = field("evidence");
  if (name.length < 2 || name.length > 160) return { status: "error", message: "Give the business a name (2 to 160 characters)." };
  if (!UUID_RE.test(categoryId)) return { status: "error", message: "Choose a category for the business." };
  if (description.length > 4000 || area.length > 160 || address.length > 300 || landmark.length > 200) return { status: "error", message: "One of the text fields is too long. Shorten it and try again." };
  if ((phone && !phoneRx.test(phone)) || (whatsapp && !phoneRx.test(whatsapp))) return { status: "error", message: "Enter a valid phone number (digits, spaces, () and -)." };
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { status: "error", message: "Enter a valid email address." };
  if (website && !/^https:\/\//.test(website)) return { status: "error", message: "The website address must start with https://" };
  if (verify && evidence.length < 10) return { status: "error", message: "To mark it Verified, record how it was checked (at least 10 characters)." };
  const logoUrl = field("logo_url");
  if (logoUrl && !/^https:\/\//.test(logoUrl)) return { status: "error", message: "The logo link must start with https://" };
  let logoKey: string | null = logoUrl || null;
  const logoFileRaw = formData.get("logo_file");
  if (logoFileRaw instanceof File && logoFileRaw.size > 0) {
    const extension = mediaExtensionFor(logoFileRaw.type);
    if (!extension) return { status: "error", message: "Logos must be JPEG, PNG, WebP or AVIF images." };
    if (logoFileRaw.size > 5_000_000) return { status: "error", message: "The logo is larger than 5 MB. Choose a smaller file." };
    const random = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, "0")).join("");
    const stem = logoFileRaw.name.replace(/\.[^.]*$/, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase().slice(0, 40) || "logo";
    const objectKey = `media/business/${new Date().getUTCFullYear()}/${random}-${stem}${extension}`;
    const written = await putMediaObject("public", objectKey, await logoFileRaw.arrayBuffer(), logoFileRaw.type);
    if (written.state === "unconfigured") return { status: "error", message: "Image storage is not connected on this deployment yet. Paste a public HTTPS logo link instead, or publish without a logo." };
    if (written.state !== "ready") return { status: "error", message: "The logo could not be stored right now. Remove it and try again in a moment." };
    logoKey = written.key;
  }
  let hours: Record<string, string> | null = null;
  const hoursRaw = field("hours_json");
  if (hoursRaw) {
    try { const parsed = parseBusinessHours(JSON.parse(hoursRaw)); hours = Object.keys(parsed).length ? parsed : null; }
    catch { hours = null; }
  }
  let result;
  try {
    result = await db.rpc("business_staff_create", {
      p_name: name, p_category_id: categoryId, p_description: description || null, p_area: area || null, p_address: address || null,
      p_landmark: landmark || null, p_phone: phone || null, p_whatsapp: whatsapp || null, p_email: email || null, p_website: website || null,
      p_hours: hours, p_verify: verify, p_evidence: verify ? evidence : null, p_logo_key: logoKey,
    });
  } catch {
    return { status: "error", message: "We could not confirm whether the listing was saved. Reload the page; do not resubmit until you have checked, to avoid duplicates." };
  }
  if (result.error || typeof result.data !== "string") return { status: "error", message: result.error?.message === "business_category_unavailable" ? "That category is no longer active. Choose another one." : "The listing could not be saved. Check your business.review access, reload and try again." };
  revalidatePath(adminHref("/business-review"));
  revalidatePath("/business-directory");
  revalidatePath("/");
  return await redirect(adminHref("/business-review?added=1"));
}

/** Approve or reject an "own this business" claim; approval links the member account as owner. */
export async function decideBusinessClaim(formData: FormData): Promise<void> {
  const db = await createStaffClient();
  const claimId = value(formData, "claim_id");
  const status = value(formData, "status");
  const note = value(formData, "note");
  if (!UUID_RE.test(claimId) || !["approved", "rejected"].includes(status) || (status === "rejected" && note.length < 2) || note.length > 1000) {
    return await redirect(adminHref("/business-review?error=claim"));
  }
  const { error } = await db.rpc("staff_decide_business_claim", { p_claim_id: claimId, p_status: status, p_note: note });
  if (error) return await redirect(adminHref("/business-review?error=claim"));
  revalidatePath(adminHref("/business-review"));
  revalidatePath("/business-directory");
  return await redirect(adminHref("/business-review?claims=1"));
}

export type StaffUpdateState = { status: "idle" | "success" | "error"; message: string };

const phoneRx = /^\+?[0-9][0-9 ()-]{6,19}$/;

/** Update a published listing in place, including its public text and category. */
export async function staffUpdateBusiness(_prev: StaffUpdateState, formData: FormData): Promise<StaffUpdateState> {
  const db = await createStaffClient();
  
  // Check business.review capability
  const { data: hasCapability } = await db.rpc("has_capability", { p_capability: "business.review" });
  if (hasCapability !== true) {
    return { status: "error", message: "You need business.review access to edit listings. Contact an administrator." };
  }
  
  const field = (key: string) => { const raw = formData.get(key); return typeof raw === "string" ? raw.trim() : ""; };
  const businessId = field("business_id");
  const name = field("name");
  const categoryId = field("category_id");
  const description = field("description");
  const area = field("area");
  const address = field("address");
  const landmark = field("landmark");
  const phone = field("phone");
  const whatsapp = field("whatsapp");
  const email = field("email");
  const website = field("website");
  const logoUrl = field("logo_url");
  if (!UUID_RE.test(businessId)) return { status: "error", message: "This listing reference is invalid. Reload the page and try again." };
  if (name.length < 2 || name.length > 160) return { status: "error", message: "Give the business a name (2 to 160 characters)." };
  if (!UUID_RE.test(categoryId)) return { status: "error", message: "Choose a category for the business." };
  if (description.length > 4000 || area.length > 160 || address.length > 300 || landmark.length > 200) return { status: "error", message: "One of the text fields is too long. Shorten it and try again." };
  if ((phone && !phoneRx.test(phone)) || (whatsapp && !phoneRx.test(whatsapp))) return { status: "error", message: "Enter a valid phone number (digits, spaces, () and -)." };
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { status: "error", message: "Enter a valid email address." };
  if (website && !/^https:\/\//.test(website)) return { status: "error", message: "The website address must start with https://" };
  if (logoUrl && !/^https:\/\//.test(logoUrl)) return { status: "error", message: "The logo link must start with https://" };
  
  // Handle logo file upload
  let logoKey: string | null = logoUrl || null;
  const logoFileRaw = formData.get("logo_file");
  if (logoFileRaw instanceof File && logoFileRaw.size > 0) {
    const extension = mediaExtensionFor(logoFileRaw.type);
    if (!extension) return { status: "error", message: "Logos must be JPEG, PNG, WebP or AVIF images." };
    if (logoFileRaw.size > 5_000_000) return { status: "error", message: "The logo is larger than 5 MB. Choose a smaller file." };
    const random = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, "0")).join("");
    const stem = logoFileRaw.name.replace(/\.[^.]*$/, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase().slice(0, 40) || "logo";
    const objectKey = `media/business/${new Date().getUTCFullYear()}/${random}-${stem}${extension}`;
    const written = await putMediaObject("public", objectKey, await logoFileRaw.arrayBuffer(), logoFileRaw.type);
    if (written.state === "unconfigured") return { status: "error", message: "Image storage is not connected on this deployment yet. Paste a public HTTPS logo link instead, or save without a logo." };
    if (written.state !== "ready") return { status: "error", message: "The logo could not be stored right now. Remove it and try again in a moment." };
    logoKey = written.key;
  }
  
  let hours: Record<string, string> | null = null;
  const hoursRaw = field("hours_json");
  if (hoursRaw) {
    try { const parsed = parseBusinessHours(JSON.parse(hoursRaw)); hours = Object.keys(parsed).length ? parsed : null; }
    catch { hours = null; }
  }
  const { error } = await db.rpc("business_staff_update", {
    p_business_id: businessId, p_name: name, p_category_id: categoryId, p_description: description || null,
    p_area: area || null, p_address: address || null, p_landmark: landmark || null, p_phone: phone || null,
    p_whatsapp: whatsapp || null, p_email: email || null, p_website: website || null, p_hours: hours,
    p_logo_key: logoKey,
  });
  if (error) return { status: "error", message: error.message === "business_category_unavailable" ? "That category is no longer active. Choose another one." : "The listing could not be saved. Check your business.review access, reload and try again." };
  revalidatePath(adminHref("/business-review"));
  revalidatePath("/business-directory");
  return { status: "success", message: "The listing was updated on the public directory." };
}

/** Completely remove a listing and everything hanging off it. Requires a recorded reason. */
export async function deleteBusiness(formData: FormData): Promise<void> {
  const db = await createStaffClient();
  const businessId = value(formData, "business_id");
  const reason = value(formData, "reason");
  if (!UUID_RE.test(businessId) || reason.length < 5 || reason.length > 1000) {
    return await redirect(adminHref("/business-review?error=delete"));
  }
  const { error } = await db.rpc("business_staff_delete", { p_business_id: businessId, p_reason: reason });
  if (error) return await redirect(adminHref("/business-review?error=delete-failed"));
  revalidatePath(adminHref("/business-review"));
  revalidatePath("/business-directory");
  revalidatePath("/");
  return await redirect(adminHref("/business-review?deleted=1"));
}

/** Replace the featured directory slot with this published business for the chosen number of days. */
export async function featureBusiness(formData: FormData): Promise<void> {
  const db = await createStaffClient();
  const businessId = value(formData, "business_id");
  const days = Number(value(formData, "days"));
  if (!UUID_RE.test(businessId) || !Number.isSafeInteger(days) || days < 1 || days > 90) {
    return await redirect(adminHref("/business-review?error=featured"));
  }
  const { error } = await db.rpc("staff_set_business_featured", { p_business_id: businessId, p_days: days });
  if (error) return await redirect(adminHref("/business-review?error=featured"));
  revalidatePath(adminHref("/business-review"));
  revalidatePath("/business-directory");
  return await redirect(adminHref("/business-review?featured=1"));
}
