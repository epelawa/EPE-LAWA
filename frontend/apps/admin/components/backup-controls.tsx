"use client";

import { useActionState, useId, useState } from "react";
// useId is used for the confirmation field id below.
import { Alert, SubmitButton } from "@epelawa/ui";
import { requestBackup, restoreBackup, type ActionState } from "../app/(protected)/backups/actions";
import type { BackupListResult } from "../lib/backup-r2";
import styles from "../app/(protected)/backups/backups.module.css";

const IDLE: ActionState = { status: "idle", message: "" };

function formatDate(value: string | null): string {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Date unavailable" : date.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

function formatSize(bytes: number): string {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

export default function BackupControls({
  initial,
  canCreate,
  canRestore,
  dispatchConfigured = true,
}: {
  initial: BackupListResult;
  canCreate: boolean;
  canRestore: boolean;
  dispatchConfigured?: boolean;
}) {
  const [restoreKey, setRestoreKey] = useState<string | null>(null);
  const confirmId = useId();
  const [createState, createAction, createPending] = useActionState(requestBackup, IDLE);
  const [restoreState, restoreAction, restorePending] = useActionState(restoreBackup, IDLE);

  return (
    <div className={styles.stack}>
      <section className={styles.panel} aria-labelledby="create-heading">
        <div className={styles.panelHead}>
          <div>
            <p className={styles.eyebrow}>On demand</p>
            <h2 id="create-heading">Create a backup</h2>
          </div>
          {canCreate ? (
            <form action={createAction}>
              <SubmitButton pendingLabel="Requesting…" disabled={createState.status === "success"}>
                Backup now
              </SubmitButton>
            </form>
          ) : null}
        </div>
        <p className={styles.muted}>
          Streams a full database dump to private R2 from GitHub Actions. The database connection string never leaves the workflow.
        </p>
        {!dispatchConfigured ? (
          <Alert variant="warning">
            <strong>Dispatch automation needs two server variables in Vercel:</strong> <code>BACKUP_DISPATCH_TOKEN</code> (a GitHub token with <em>actions:write</em> on the repository) and <code>BACKUP_WORKFLOW_REPO</code> (set it to <code>epelawa/EPE-LAWA</code>). Redeploy after saving; the workflows themselves already carry the database and R2 secrets.
          </Alert>
        ) : null}
        {createState.status !== "idle" ? (
          <Alert variant={createState.status === "success" ? "success" : "error"}>{createState.message}</Alert>
        ) : null}
        {!canCreate ? <Alert variant="info">Your role does not include <strong>backup.create</strong>.</Alert> : null}
      </section>

      <section className={styles.panel} aria-labelledby="list-heading">
        <div className={styles.panelHead}>
          <div>
            <p className={styles.eyebrow}>Private storage</p>
            <h2 id="list-heading">Available backups</h2>
          </div>
        </div>

        {initial.state === "unconfigured" ? (
          <Alert variant="warning">
            Backup storage is not configured on the server. Missing variables: {initial.missing.join(", ")}. Set them in Vercel for the admin app, then reload this page.
          </Alert>
        ) : initial.state === "unavailable" ? (
          <Alert variant="error">Backup metadata could not be read right now. No action was taken.</Alert>
        ) : initial.backups.length === 0 ? (
          <p className={styles.muted}>No backups have been created yet.</p>
        ) : (
          <ul className={styles.list}>
            {initial.backups.map((backup) => (
              <li key={backup.key} className={styles.item}>
                <div className={styles.itemMain}>
                  <span className={styles.itemName}>{backup.key.split("/").pop()}</span>
                  <span className={styles.itemMeta}>{formatDate(backup.uploaded)} · {formatSize(backup.size)}</span>
                  <code className={styles.key}>{backup.key}</code>
                </div>
                {canRestore ? (
                  <button
                    type="button"
                    className={styles.restoreButton}
                    onClick={() => setRestoreKey(backup.key)}
                    disabled={restorePending}
                  >
                    Restore
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {canRestore && restoreKey ? (
        <section className={`${styles.panel} ${styles.dangerPanel}`} aria-labelledby="restore-heading">
          <div className={styles.panelHead}>
            <div>
              <p className={styles.eyebrow}>Destructive action</p>
              <h2 id="restore-heading">Confirm restore</h2>
            </div>
            <button type="button" className={styles.cancelButton} onClick={() => setRestoreKey(null)} disabled={restorePending}>
              Cancel
            </button>
          </div>
          <Alert variant="error">
            Restoring overwrites the live database. A fresh safety backup is taken automatically before the restore begins. This cannot be undone from this screen.
          </Alert>
          <p className={styles.muted}>
            Type the exact key below to confirm:
          </p>
          <code className={styles.key}>{restoreKey}</code>
          <form action={restoreAction} className={styles.restoreForm}>
            <input type="hidden" name="key" value={restoreKey} />
            <label htmlFor={confirmId}>Backup key</label>
            <input
              id={confirmId}
              name="confirmation"
              type="text"
              autoComplete="off"
              spellCheck={false}
              required
              disabled={restorePending}
              placeholder="Paste the full key above"
            />
            <SubmitButton variant="secondary" pendingLabel="Dispatching…">
              Restore from this backup
            </SubmitButton>
          </form>
          {restoreState.status !== "idle" ? (
            <Alert variant={restoreState.status === "success" ? "success" : "error"}>{restoreState.message}</Alert>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
