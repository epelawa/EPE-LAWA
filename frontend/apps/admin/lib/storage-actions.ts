"use server";

import { cookies } from "next/headers";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { adminRedirect as redirect } from "./admin-redirect";
import { adminHref } from "./admin-path";
import { createStaffClient } from "./supabase";
import { readAdminSessionFromCookies } from "./supabase-access";
import { formAdminClient } from "../../main/lib/form-server";
import { openStorageJob, runStorageCleanup, runStorageCompression } from "./storage-jobs";
import type { BucketName } from "./storage-r2";

const back = (result: string) => `${adminHref("/storage")}?result=${encodeURIComponent(result)}`;

/** Same gate as the AI and Roles desks: only the primary administrators. */
async function primaryAdmin() {
  const db = await createStaffClient();
  const check = await db.rpc("staff_roles_authorized");
  if (check.error || check.data !== true) return null;
  const session = readAdminSessionFromCookies((await cookies()).getAll().map(({ name, value }) => ({ name, value })));
  return { userId: session?.user?.id ?? null };
}

function bucketsFrom(form: FormData): BucketName[] | null {
  const scope = form.get("scope");
  if (scope === "public") return ["public"];
  if (scope === "private") return ["private"];
  if (scope === "both" || scope === null) return ["public", "private"];
  return null;
}

async function start(form: FormData, kind: "cleanup" | "compress", dryRun = false): Promise<void> {
  const admin = await primaryAdmin();
  if (!admin) return await redirect(back("denied"));
  const buckets = bucketsFrom(form);
  if (!buckets) return await redirect(back("failed"));
  let service;
  try {
    service = formAdminClient();
  } catch {
    return await redirect(back("no-service"));
  }
  const scope = `${buckets.join("+")}${dryRun ? ":check" : ""}`;
  const opened = await openStorageJob(service, kind, scope, admin.userId);
  if ("busy" in opened) return await redirect(back("busy"));
  if ("error" in opened) return await redirect(back("failed"));
  const job = kind === "cleanup"
    ? runStorageCleanup(service, opened.id, { buckets, dryRun })
    : runStorageCompression(service, opened.id, { buckets });
  after(() => job.catch((error: unknown) => console.error("storage job failed", { kind, message: error instanceof Error ? error.message : "unknown" })));
  revalidatePath(adminHref("/storage"));
  return await redirect(back(kind === "compress" ? "compress-started" : dryRun ? "check-started" : "cleanup-started"));
}

export async function checkUnusedFiles(form: FormData): Promise<void> {
  return start(form, "cleanup", true);
}

export async function removeUnusedFiles(form: FormData): Promise<void> {
  if (form.get("confirm") !== "REMOVE") return await redirect(back("confirm"));
  return start(form, "cleanup", false);
}

export async function compressAllImages(form: FormData): Promise<void> {
  return start(form, "compress");
}
