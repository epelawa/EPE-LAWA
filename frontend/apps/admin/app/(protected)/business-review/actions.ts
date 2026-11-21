"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminHref } from "../../../lib/admin-path";
import { createClient } from "../../../lib/supabase";

const value = (form: FormData, key: string) => {
  const raw = form.get(key);
  return typeof raw === "string" ? raw.trim() : "";
};

export async function reviewBusiness(formData: FormData): Promise<void> {
  const db = await createClient();
  const id = value(formData, "business_id");
  const status = value(formData, "status");
  const note = value(formData, "note");
  const evidence = value(formData, "evidence");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["reviewing", "published", "rejected"].includes(status) || note.length < 5 || note.length > 1000 || (status === "published" && (evidence.length < 10 || evidence.length > 2000))) {
    redirect(adminHref("/business-review?error=invalid"));
  }
  const { error } = await db.rpc("business_review_decide", { p_business_id:id, p_status:status, p_note:note, p_evidence:evidence || null });
  if (error) redirect(adminHref("/business-review?error=action-failed"));
  revalidatePath(adminHref("/business-review"));
  revalidatePath("/business-directory");
  redirect(adminHref("/business-review?updated=1"));
}

const UUID_RE = /^[0-9a-f-]{36}$/i;
export type StaffCreateState = { status: "idle" | "success" | "error"; message: string };

export async function staffCreateBusiness(_prev: StaffCreateState, formData: FormData): Promise<StaffCreateState> {
  const db = await createClient();
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
  const phoneRx = /^\+?[0-9][0-9 ()-]{6,19}$/;
  if ((phone && !phoneRx.test(phone)) || (whatsapp && !phoneRx.test(whatsapp))) return { status: "error", message: "Enter a valid phone number (digits, spaces, () and -)." };
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { status: "error", message: "Enter a valid email address." };
  if (website && !/^https:\/\//.test(website)) return { status: "error", message: "The website address must start with https://" };
  if (verify && evidence.length < 10) return { status: "error", message: "To mark it Verified, record how it was checked (at least 10 characters)." };
  let result;
  try {
    result = await db.rpc("business_staff_create", {
      p_name: name, p_category_id: categoryId, p_description: description || null, p_area: area || null, p_address: address || null,
      p_landmark: landmark || null, p_phone: phone || null, p_whatsapp: whatsapp || null, p_email: email || null, p_website: website || null,
      p_hours: null, p_verify: verify, p_evidence: verify ? evidence : null,
    });
  } catch {
    return { status: "error", message: "We could not confirm whether the listing was saved. Reload the page; do not resubmit until you have checked, to avoid duplicates." };
  }
  if (result.error || typeof result.data !== "string") return { status: "error", message: result.error?.message === "business_category_unavailable" ? "That category is no longer active. Choose another one." : "The listing could not be saved. Check your business.review access, reload and try again." };
  revalidatePath(adminHref("/business-review"));
  revalidatePath("/business-directory");
  revalidatePath("/");
  redirect(adminHref("/business-review?added=1"));
}
