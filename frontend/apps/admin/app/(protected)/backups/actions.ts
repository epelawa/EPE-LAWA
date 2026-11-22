"use server";
import "server-only";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient, createStaffClient } from "../../../lib/supabase";
import { dispatchBackupWorkflow, type DispatchResult } from "../../../lib/backup-dispatch";
import { isBackupKey } from "../../../lib/backup-r2";

export type ActionState = { status: "idle" | "success" | "error"; message: string };

const KEY_PATTERN = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/;

/** Deterministic nil-safe uuid so a string backup key can be audited consistently. */
function keyAsUuid(key: string): string {
  const hex = createHash("sha256").update(key).digest("hex").slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const h = hex.join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

async function requireCapability(capability: string) {
  if (!KEY_PATTERN.test(capability)) throw new Error("Invalid capability.");
  const db = await createStaffClient();
  const { data, error } = await db.rpc("has_capability", { p_capability: capability });
  if (error || data !== true) throw new Error("This action is not authorised for your role.");
  return db;
}

async function audit(
  db: Awaited<ReturnType<typeof createClient>>,
  action: string,
  key: string,
  outcome: "requested" | "rejected",
) {
  await db.rpc("audit_event", {
    p_actor_kind: "staff",
    p_action: action,
    p_resource_type: "database_backup",
    p_resource_id: keyAsUuid(key),
    p_outcome: outcome,
    p_metadata: { key, via: "admin_backup_workspace" },
  });
}

function describe(result: DispatchResult): ActionState {
  if (result.ok) return { status: "success", message: "Workflow accepted. Track progress in GitHub Actions." };
  if (result.reason === "unconfigured") {
    return { status: "error", message: `Backup automation is not configured. Missing server variables: ${result.missing.join(", ")}.` };
  }
  if (result.reason === "rejected") return { status: "error", message: "The automation provider rejected this request." };
  return { status: "error", message: "The automation provider is unavailable. Nothing was dispatched." };
}

export async function requestBackup(_previous: ActionState, form: FormData): Promise<ActionState> {
  try {
    const db = await requireCapability("backup.create");
    const label = String(form.get("label") ?? "").trim().slice(0, 60);
    if (label && !/^[a-zA-Z0-9 _-]+$/.test(label)) {
      return { status: "error", message: "Label may contain only letters, numbers, spaces, dash and underscore." };
    }
    const inputs: Record<string, string> = label ? { label } : {};
    const result = await dispatchBackupWorkflow("db-backup.yml", inputs);
    if (result.ok) await audit(db, "backup.request", `on-demand:${Date.now()}`, "requested");
    revalidatePath("/backups");
    return describe(result);
  } catch {
    return { status: "error", message: "This action is not authorised for your role." };
  }
}

export async function restoreBackup(_previous: ActionState, form: FormData): Promise<ActionState> {
  let key = "invalid";
  try {
    const db = await requireCapability("backup.restore");
    key = String(form.get("key") ?? "").trim();
    const confirmation = String(form.get("confirmation") ?? "").trim();

    // Type-to-confirm must be byte-for-byte the key. No fuzzy match, no fallback.
    if (!isBackupKey(key) || confirmation !== key) {
      await audit(db, "backup.restore", key.slice(0, 200), "rejected");
      return { status: "error", message: "Confirmation did not match the backup key. Nothing was restored." };
    }

    // Automatic pre-restore backup first. If it fails, abort — never restore without a fresh snapshot.
    const preflight = await dispatchBackupWorkflow("db-backup.yml", { reason: "pre-restore", target: key });
    if (!preflight.ok) {
      await audit(db, "backup.restore", key, "rejected");
      return { status: "error", message: "A fresh safety backup could not be started. Restore was aborted." };
    }

    const result = await dispatchBackupWorkflow("db-restore.yml", { key });
    if (result.ok) await audit(db, "backup.restore", key, "requested");
    else await audit(db, "backup.restore", key, "rejected");
    revalidatePath("/backups");
    return describe(result);
  } catch {
    return { status: "error", message: "This action is not authorised for your role." };
  }
}
