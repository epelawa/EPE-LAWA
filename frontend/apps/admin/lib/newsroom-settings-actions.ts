"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminHref } from "./admin-path";
import { createClient } from "./supabase";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function value(form: FormData, key: string, max: number): string {
  const item = form.get(key);
  return typeof item === "string" ? item.trim().slice(0, max) : "";
}
function destination(kind: "category" | "byline", result: "saved" | "invalid" | "conflict" | "failed"): never {
  redirect(adminHref(`/newsroom/settings?${kind}=${result}`));
}
function errorCode(error: unknown): string {
  return error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : "";
}
async function save(kind: "category" | "byline", formData: FormData): Promise<void> {
  const id = value(formData, "id", 64);
  const slug = value(formData, "slug", 100).toLowerCase();
  const validId = !id || UUID.test(id);
  const commonValid = validId && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
  let rpc: "newsroom_category_save" | "newsroom_byline_save";
  let args: Record<string, unknown>;
  if (kind === "category") {
    const label = value(formData, "label", 60);
    const sortOrderText = value(formData, "sortOrder", 10);
    const sortOrder = Number(sortOrderText);
    const description = value(formData, "description", 500);
    const active = formData.get("isActive") === "on";
    if (!commonValid || !label || !/^-?\d{1,9}$/.test(sortOrderText) || !Number.isInteger(sortOrder)) destination(kind, "invalid");
    rpc = "newsroom_category_save";
    args = { p_id: id || null, p_slug: slug, p_label: label, p_description: description || null, p_sort_order: sortOrder, p_is_active: active };
  } else {
    const displayName = value(formData, "displayName", 120);
    const bio = value(formData, "bio", 2000);
    const photoKey = value(formData, "photoKey", 500);
    if (!commonValid || !displayName) destination(kind, "invalid");
    rpc = "newsroom_byline_save";
    args = { p_id: id || null, p_slug: slug, p_display_name: displayName, p_bio: bio || null, p_photo_key: photoKey || null };
  }
  try {
    const client = await createClient();
    const result = await client.rpc(rpc, args);
    if (result.error) {
      console.error("newsroom reference save failed", { kind, code: errorCode(result.error) });
      destination(kind, result.error.code === "23505" ? "conflict" : "failed");
    }
    if (typeof result.data !== "string" || !UUID.test(result.data)) destination(kind, "failed");
  } catch (error) {
    // Next redirect is a control-flow exception, not an RPC failure.
    if (error && typeof error === "object" && "digest" in error) throw error;
    console.error("newsroom reference save failed", { kind, code: errorCode(error) });
    destination(kind, "failed");
  }
  revalidatePath(adminHref("/newsroom/settings"));
  revalidatePath(adminHref("/newsroom/new"));
  revalidatePath(adminHref("/newsroom"));
  destination(kind, "saved");
}
export async function saveNewsroomCategory(formData: FormData): Promise<void> {
  await save("category", formData);
}
export async function saveNewsroomByline(formData: FormData): Promise<void> {
  await save("byline", formData);
}
