import { PageFrame, PageIntro, Notice } from "@epelawa/ui";
import { createClient } from "../../../lib/supabase";
import { listBackups } from "../../../lib/backup-r2";
import BackupControls from "../../../components/backup-controls";
import styles from "./backups.module.css";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function capability(name: string): Promise<boolean> {
  try {
    const db = await createClient();
    const { data, error } = await db.rpc("has_capability", { p_capability: name });
    return !error && data === true;
  } catch {
    return false;
  }
}

export default async function BackupsPage() {
  const [canRead, canCreate, canRestore] = await Promise.all([
    capability("backup.read"),
    capability("backup.create"),
    capability("backup.restore"),
  ]);

  return (
    <PageFrame className={styles.page}>
      <PageIntro
        eyebrow="System / Recovery"
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
        />
      )}
    </PageFrame>
  );
}
