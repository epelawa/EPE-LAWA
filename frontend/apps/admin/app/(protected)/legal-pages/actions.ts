"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createStaffClient } from "../../../lib/supabase";

const PAGES = new Set(["privacy", "terms", "guidelines"]);
const ERRORS: Record<string, string> = {
  unknown_page: "That legal page is not editable.",
  body_too_long: "The text is too long. Keep it within the stated limit.",
  revision_conflict: "The page changed while you were editing. Open it again and apply your text once more.",
  failed: "The legal page could not be saved. Reload and try again.",
};

function field(form: FormData, name: string, max: number): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function saveLegalPage(form: FormData): Promise<void> {
  const page = field(form, "page", 20);
  if (!PAGES.has(page)) redirect(`/legal-pages?status=error&reason=unknown_page`);
  const body = field(form, "body", 50000);
  const revisionRaw = field(form, "revision", 12);
  const revision = Number.parseInt(revisionRaw || "0", 10);
  if (revisionRaw !== "" && !Number.isFinite(revision)) redirect(`/legal-pages?status=error&reason=failed`);

  let code = "";
  let savedRevision: number | null = null;
  const db = await createStaffClient();
  try {
    const { data, error } = await db.rpc("site_page_save", { p_page: page, p_body: body, p_photos: [], p_revision: revision });
    if (error) code = typeof (error as { message?: unknown }).message === "string" ? (error as { message: string }).message : "";
    else savedRevision = typeof data === "number" ? data : null;
  } catch { code = ""; }

  if (savedRevision === null) {
    const reason = code in ERRORS ? code : "failed";
    redirect(`/legal-pages?status=error&reason=${reason}#page-${page}`);
  }

  revalidatePath("/privacy");
  revalidatePath("/terms");
  revalidatePath("/guidelines");
  revalidatePath("/legal-pages");
  redirect(`/legal-pages?status=saved${savedRevision ? `&rev=${savedRevision}` : ""}#page-${page}`);
}
