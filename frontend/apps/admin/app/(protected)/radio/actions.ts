"use server";
import { revalidatePath } from "next/cache";
import { adminRedirect as redirect } from "../../../lib/admin-redirect";
import { adminHref } from "../../../lib/admin-path";
import { createClient, createStaffClient } from "../../../lib/supabase";

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
  const db = await createStaffClient();
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
async function outcome(code: string): Promise<never> { return await redirect(adminHref(`/radio?radio=${encodeURIComponent(code)}`)); }
async function run(work: () => Promise<void>, success = "saved", fallback = "save") {
  try { await work(); }
  catch (error) {
    // Redirect exceptions are Next control flow; never turn them into a second outcome.
    if (error && typeof error === "object" && "digest" in error) throw error;
    const message = error instanceof Error ? error.message : fallback;
    return await outcome(["conflict", "denied", "invalid", "linked", "remove"].includes(message) ? message : fallback);
  }
  return await outcome(success);
}
async function remove(db: Awaited<ReturnType<typeof createClient>>, table: string, id: string) {
  const { error, count } = await db.from(table).delete({ count: "exact" }).eq("id", id);
  if (error) {
    const message = error.message.toLowerCase();
    if (error.code === "23503" || message.includes("foreign key") || message.includes("referenced")) throw new Error("linked");
    if (error.code === "42501" || message.includes("row-level")) throw new Error("denied");
    throw new Error("remove");
  }
  if (count === 0) throw new Error("conflict");
  revalidatePath(adminHref("/radio"));
}
async function deleteTarget(f: FormData, kind: string) {
  if (text(f, "kind", 20) !== kind) throw new Error("invalid");
  const id = recordId(f);
  if (!id) throw new Error("invalid");
  const db = await authorized();
  await remove(db, kind === "programme" ? "programmes" : "radio_schedule", id);
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
export async function deleteProgramme(f: FormData) { await run(async () => { await deleteTarget(f, "programme"); }, "deleted", "remove"); }
export async function deleteSchedule(f: FormData) { await run(async () => { await deleteTarget(f, "schedule"); }, "deleted", "remove"); }
