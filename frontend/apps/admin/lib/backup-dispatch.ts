import "server-only";

/**
 * Server-only GitHub Actions dispatch for backup/restore workflows.
 *
 * SECURITY: the GitHub token and repository name are read from server env and
 * never returned. Callers receive only a boolean/safe status. The workflows
 * themselves hold the DATABASE_URL and R2 write secrets — the browser and the
 * Next.js server never handle the database connection string.
 */

export type DispatchResult =
  | { ok: true }
  | { ok: false; reason: "unconfigured"; missing: string[] }
  | { ok: false; reason: "rejected" | "unavailable" };

const API_ROOT = "https://api.github.com";

export async function dispatchBackupWorkflow(
  workflowFile: "db-backup.yml" | "db-restore.yml",
  inputs: Record<string, string>,
): Promise<DispatchResult> {
  const token = process.env.BACKUP_DISPATCH_TOKEN?.trim();
  const repo = process.env.BACKUP_WORKFLOW_REPO?.trim();
  const ref = process.env.BACKUP_WORKFLOW_REF?.trim() || "main";

  if (!token || !repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    const missing = [
      "BACKUP_DISPATCH_TOKEN",
      "BACKUP_WORKFLOW_REPO",
    ].filter(name => !({ BACKUP_DISPATCH_TOKEN: token, BACKUP_WORKFLOW_REPO: repo }[name]));
    return { ok: false, reason: "unconfigured", missing };
  }
  if (workflowFile !== "db-backup.yml" && workflowFile !== "db-restore.yml") {
    return { ok: false, reason: "rejected" };
  }

  try {
    const response = await fetch(
      `${API_ROOT}/repos/${repo}/actions/workflows/${workflowFile}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({ ref, inputs }),
        signal: AbortSignal.timeout(8_000),
        cache: "no-store",
      },
    );
    // GitHub returns 204 No Content on an accepted dispatch.
    if (response.status === 204) return { ok: true };
    if (response.status === 401 || response.status === 403 || response.status === 422) {
      return { ok: false, reason: "rejected" };
    }
    return { ok: false, reason: "unavailable" };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
