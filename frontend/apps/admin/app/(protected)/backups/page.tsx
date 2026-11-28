import { PageFrame, PageIntro, Notice } from "@epelawa/ui";
import { createStaffClient, type StaffClient } from "../../../lib/supabase";
import { listBackups } from "../../../lib/backup-r2";
import { backupDispatchConfigured } from "../../../lib/backup-dispatch";
import BackupControls from "../../../components/backup-controls";
import styles from "./backups.module.css";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function capability(db: StaffClient, name: string): Promise<boolean> {
  const { data, error } = await db.rpc("has_capability", { p_capability: name });
  return !error && data === true;
}

export default async function BackupsPage() {
  const db = await createStaffClient();
  const [canRead, canCreate, canRestore] = await Promise.all([
    capability(db, "backup.read"),
    capability(db, "backup.create"),
    capability(db, "backup.restore"),
  ]);

  return (
    <PageFrame className={styles.page}>
      <PageIntro
        title="Backup &amp; restore"
        description="On-demand snapshots of the live database, stored in private R2. Restores are capability-gated, require typed confirmation, and always take a fresh safety snapshot first."
      />

      {!canRead ? (
        <Notice tone="warning">
          Your role does not include <strong>backup.read</strong>. Backup metadata is hidden. Ask an administrator to grant the capability.
        </Notice>
      ) : (
        <BackupControls
          initial={await listBackups()}
          canCreate={canCreate}
          canRestore={canRestore}
          dispatchConfigured={backupDispatchConfigured()}
        />
      )}
    </PageFrame>
  );
}
