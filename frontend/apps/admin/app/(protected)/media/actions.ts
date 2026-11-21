"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminHref } from "../../../lib/admin-path";
import { createClient } from "../../../lib/supabase";

const text = (f: FormData, key: string, max: number) => String(f.get(key) ?? "").trim().slice(0, max);
function outcome(code: string): never { redirect(adminHref(`/media?media=${encodeURIComponent(code)}`)); }
async function run(work: () => Promise<void>, success: string, fallback: string) {
  try { await work(); }
  catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    const message = error instanceof Error ? error.message : fallback;
    outcome(["denied", "invalid", "missing"].includes(message) ? message : fallback);
  }
  outcome(success);
}
async function authorized() {
  const db = await createClient();
  const { data, error } = await db.rpc("has_capability", { p_capability: "site.content" });
  if (error || data !== true) throw new Error("denied");
  return db;
}

export async function addGalleryPhoto(f: FormData) { await run(async () => {
  const title = text(f, "title", 160), credit = text(f, "credit", 300), alt = text(f, "alt_text", 300), url = text(f, "media_url", 2048), rights = text(f, "rights_note", 2000);
  if (title.length < 2 || alt.length < 5 || !url || !/^https:\/\//.test(url) || !/^[^\s]+$/.test(url) || rights.length < 5) throw new Error("invalid");
  const db = await authorized();
  const { error } = await db.rpc("gallery_photo_add", { p_title: title, p_credit: credit, p_alt_text: alt, p_media_url: url, p_rights_note: rights });
  if (error) {
    const message = error.message.toLowerCase();
    if (error.code === "42501" || message.includes("forbidden") || message.includes("denied")) throw new Error("denied");
    throw new Error("invalid");
  }
  revalidatePath(adminHref("/media"));
  revalidatePath("/gallery");
}, "added", "add"); }

export async function removeGalleryPhoto(f: FormData) { await run(async () => {
  const id = text(f, "asset_id", 36);
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("invalid");
  const db = await authorized();
  const { error } = await db.rpc("gallery_photo_remove", { p_asset_id: id });
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("not_found")) throw new Error("missing");
    if (error.code === "42501" || message.includes("forbidden") || message.includes("denied")) throw new Error("denied");
    throw new Error("remove");
  }
  revalidatePath(adminHref("/media"));
  revalidatePath("/gallery");
}, "removed", "remove"); }
