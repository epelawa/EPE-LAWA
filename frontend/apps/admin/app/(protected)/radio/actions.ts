"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminHref } from "../../../lib/admin-path";
import { createClient } from "../../../lib/supabase";

const text = (f: FormData, key: string, max: number) => String(f.get(key) ?? "").trim().slice(0, max);
function slugify(value: string) { return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80); }
function revision(f: FormData): number | null {
  const raw = text(f, "revision", 20);
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) throw new Error("invalid");
  return value;
}
function recordId(f: FormData): string | null {
  const id = text(f, "id", 36);
  if (!id) return null;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !revision(f)) throw new Error("invalid");
  return id;
}
async function authorized() {
  const db = await createClient();
  const { data, error } = await db.rpc("has_capability", { p_capability: "radio.manage" });
  if (error || data !== true) throw new Error("denied");
  return db;
}
async function save(db: Awaited<ReturnType<typeof createClient>>, resource: string, id: string | null, rev: number | null, data: Record<string, unknown>, rights: string) {
  const { error } = await db.rpc("radio_authoring_save", { p_resource_type: resource, p_id: id, p_expected_revision: rev, p_data: data, p_rights_note: rights || null });
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("revision_conflict")) throw new Error("conflict");
    if (error.code === "42501" || message.includes("denied") || message.includes("capability")) throw new Error("denied");
    throw new Error("save");
  }
  revalidatePath(adminHref("/radio"));
}
function outcome(code: string): never { redirect(adminHref(`/radio?radio=${encodeURIComponent(code)}`)); }
async function run(work: () => Promise<void>) {
  try { await work(); }
  catch (error) {
    // Redirect exceptions are Next control flow; never turn them into a second outcome.
    if (error && typeof error === "object" && "digest" in error) throw error;
    const message = error instanceof Error ? error.message : "save";
    outcome(["conflict", "denied", "invalid"].includes(message) ? message : "save");
  }
  outcome("saved");
}

export async function saveProgramme(f: FormData) { await run(async () => {
  const name = text(f, "name", 120), description = text(f, "description", 4000), rights = text(f, "rights_note", 2000), id = recordId(f), status = text(f, "publication_status", 12);
  if (!name || !["draft", "published", "withdrawn"].includes(status) || (status === "published" && rights.length < 3)) throw new Error("invalid");
  const db = await authorized();
  await save(db, "programme", id, id ? revision(f) : null, { name, description: description || null, slug: slugify(name), publication_status: status }, rights);
}); }
export async function saveSchedule(f: FormData) { await run(async () => {
  const id = recordId(f), rev = id ? revision(f) : null, programme_id = text(f, "programme_id", 36), day = Number(f.get("day_of_week")), starts_at = text(f, "starts_at", 8), ends_at = text(f, "ends_at", 8), note = text(f, "note", 1000), rights = text(f, "rights_note", 2000), status = text(f, "publication_status", 12);
  if (!/^[0-9a-f-]{36}$/i.test(programme_id) || !Number.isInteger(day) || day < 0 || day > 6 || !/^\d{2}:\d{2}$/.test(starts_at) || !/^\d{2}:\d{2}$/.test(ends_at) || !["draft", "published", "withdrawn"].includes(status) || (status === "published" && rights.length < 3)) throw new Error("invalid");
  const db = await authorized();
  await save(db, "schedule", id, rev, { programme_id, day_of_week: day, starts_at, ends_at, note: note || null, publication_status: status }, rights);
}); }
export async function saveEpisode(f: FormData) { await run(async () => {
  const id = recordId(f), rev = id ? revision(f) : null, programme_id = text(f, "programme_id", 36), title = text(f, "title", 200), description = text(f, "description", 4000), rights = text(f, "rights_note", 2000), external_url = text(f, "external_url", 2048), aired_on = text(f, "aired_on", 10), status = text(f, "publication_status", 12);
  if (!/^[0-9a-f-]{36}$/i.test(programme_id) || !title || !["draft", "published", "withdrawn"].includes(status) || (status === "published" && rights.length < 3) || (external_url && !/^https:\/\//.test(external_url)) || (aired_on && !/^\d{4}-\d{2}-\d{2}$/.test(aired_on))) throw new Error("invalid");
  const db = await authorized();
  let slug: string;
  if (id) {
    const { data, error } = await db.from("episodes").select("slug").eq("id", id).maybeSingle();
    if (error || !data?.slug) throw new Error("save");
    slug = data.slug;
  } else slug = `${slugify(title)}-${Date.now().toString(36)}`;
  await save(db, "episode", id, rev, { programme_id, title, slug, description: description || null, external_url: external_url || null, aired_on: aired_on || null, publication_status: status }, rights);
}); }
