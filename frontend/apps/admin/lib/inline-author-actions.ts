"use server";
import { randomUUID } from "node:crypto";
import { createClient } from "./supabase";

/** Create a reusable byline through the existing publish-capability-gated, audited RPC. */
export async function addInlineAuthor(value: string): Promise<{ id: string; name: string } | { error: string }> {
  if (typeof value !== "string") return { error: "Enter an author name." };
  const name = value.trim();
  if (!name || name.length > 120 || /[\u0000-\u001f\u007f]/.test(name)) return { error: "Enter an author name of up to 120 characters." };
  const base = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70).replace(/-+$/g, "") || "author";
  const slug = `${base}-${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  try {
    const db = await createClient();
    const result = await db.rpc("newsroom_byline_save", { p_id: null, p_slug: slug, p_display_name: name, p_bio: null, p_photo_key: null });
    if (result.error || typeof result.data !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result.data)) return { error: "Could not add this author. Creating authors requires publishing access." };
    return { id: result.data, name };
  } catch { return { error: "Could not add this author. Check your connection and publishing access." }; }
}
