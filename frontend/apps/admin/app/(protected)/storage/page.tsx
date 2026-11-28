import type { Metadata } from "next";
import Link from "../../../components/admin-link";
import { EmptyPanel, Notice, PageFrame, PageIntro, Panel, SectionHeading, StatusBadge, SubmitButton } from "@epelawa/ui";
import ConfirmSubmit from "../../../components/confirm-submit";
import LiveRefresh from "../../../components/live-refresh";
import { createStaffClient } from "../../../lib/supabase";
import { adminHref } from "../../../lib/admin-path";
import { lagosExact } from "../../../lib/lagos-time";
import { listBucket, type Inventory } from "../../../lib/storage-r2";
import { AREA_LABELS, areaOf, formatBytes, pieSlices, R2_FREE_BYTES, SUPABASE_FREE_BYTES, type Slice } from "../../../lib/storage-plan";
import { checkUnusedFiles, compressAllImages, removeUnusedFiles } from "../../../lib/storage-actions";
import { formAdminClient } from "../../../../main/lib/form-server";
import styles from "./storage.module.css";

export const metadata: Metadata = { title: "Storage", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

type Job = { id: string; kind: string; scope: string; status: string; progress: string | null; stats: Record<string, unknown>; started_at: string; finished_at: string | null };

const messages: Record<string, { tone: "success" | "danger" | "warning"; text: string }> = {
  denied: { tone: "danger", text: "Only the primary administrators can clean or compress storage." },
  failed: { tone: "danger", text: "The job could not be started. Try again." },
  busy: { tone: "warning", text: "Another storage job is still running. Wait for it to finish below." },
  confirm: { tone: "warning", text: "Removal was not confirmed, so nothing was deleted." },
  "no-service": { tone: "danger", text: "The storage service key is not set in the hosting environment, so storage jobs cannot run." },
  "check-started": { tone: "success", text: "Checking which files are unused. Nothing is deleted by a check." },
  "cleanup-started": { tone: "success", text: "Removing unused files. Every image an article, page or listing uses is kept." },
  "compress-started": { tone: "success", text: "Compressing every image to the maximum. Links stay the same, so nothing disappears from the site." },
};

const COLORS: Record<string, string> = {
  database: "#2563eb",
  covers: "#16a34a",
  business: "#f59e0b",
  people: "#a855f7",
  site: "#06b6d4",
  avatars: "#ec4899",
  submissions: "#84cc16",
  backups: "#64748b",
  other: "#f97316",
};

function statusTone(status: string): "success" | "warning" | "danger" | "neutral" {
  return status === "success" ? "success" : status === "failed" ? "danger" : status === "partial" || status === "running" ? "warning" : "neutral";
}

function jobTitle(job: Job): string {
  if (job.kind === "compress") return "Compress everything";
  return job.scope.endsWith(":check") ? "Check unused files" : "Remove unused files";
}

function bucketTotal(inventory: Inventory): number {
  return inventory.state === "ready" ? inventory.objects.reduce((sum, object) => sum + object.size, 0) : 0;
}

export default async function StoragePage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  const db = await createStaffClient();
  const access = await db.rpc("staff_roles_authorized");
  if (access.error || access.data !== true) {
    return <PageFrame><PageIntro title="Storage" description="Database and file storage." />
      <EmptyPanel title={access.error ? "Access could not be verified" : "Primary administrators only"} description="Storage cleanup deletes files, so only the primary administrators can use it." actions={<Link href={adminHref("/")}>Back to dashboard</Link>} />
    </PageFrame>;
  }
  const { result } = await searchParams;
  const notice = result ? messages[result] : undefined;

  let databaseBytes = 0;
  let tables: { name: string; bytes: number }[] = [];
  let jobs: Job[] = [];
  let savedTotal = 0;
  let serviceReady = true;
  try {
    const service = formAdminClient();
    const [usage, jobRows, compressed] = await Promise.all([
      service.rpc("storage_db_usage"),
      service.from("storage_jobs").select("id,kind,scope,status,progress,stats,started_at,finished_at").order("started_at", { ascending: false }).limit(12),
      service.from("storage_compressed").select("bytes_before,bytes_after").limit(50_000),
    ]);
    const usageData = (usage.data ?? {}) as { database_bytes?: number; tables?: { name: string; bytes: number }[] };
    databaseBytes = Number(usageData.database_bytes ?? 0);
    tables = Array.isArray(usageData.tables) ? usageData.tables : [];
    jobs = (jobRows.data ?? []) as Job[];
    savedTotal = (compressed.data ?? []).reduce((sum, row) => sum + Math.max(0, Number(row.bytes_before) - Number(row.bytes_after)), 0);
  } catch {
    serviceReady = false;
  }

  const [publicBucket, privateBucket] = await Promise.all([listBucket("public"), listBucket("private")]);
  const r2Missing = publicBucket.state === "unconfigured" ? publicBucket.missing : [];
  const areaBytes = new Map<string, { bytes: number; count: number }>();
  for (const inventory of [publicBucket, privateBucket]) {
    if (inventory.state !== "ready") continue;
    for (const object of inventory.objects) {
      const area = areaOf(object.key);
      const entry = areaBytes.get(area) ?? { bytes: 0, count: 0 };
      entry.bytes += object.size;
      entry.count += 1;
      areaBytes.set(area, entry);
    }
  }
  const r2Bytes = bucketTotal(publicBucket) + bucketTotal(privateBucket);
  const r2Objects = (publicBucket.state === "ready" ? publicBucket.objects.length : 0) + (privateBucket.state === "ready" ? privateBucket.objects.length : 0);
  const slices: (Slice & { key: string; count?: number })[] = [
    { key: "database", label: "Site database", bytes: databaseBytes, color: COLORS.database },
    ...[...areaBytes.entries()].sort((a, b) => b[1].bytes - a[1].bytes).map(([area, entry]) => ({ key: area, label: `Files · ${AREA_LABELS[area]}`, bytes: entry.bytes, count: entry.count, color: COLORS[area] ?? COLORS.other })),
  ];
  const paths = pieSlices(slices);
  const total = databaseBytes + r2Bytes;
  const running = jobs.some((job) => job.status === "running");
  const latestCheck = jobs.find((job) => job.kind === "cleanup" && job.status !== "running");
  const r2Ready = publicBucket.state === "ready" || privateBucket.state === "ready";
  const bucketNote = (inventory: Inventory) => inventory.state === "ready" ? `${inventory.objects.length.toLocaleString("en-NG")} files · ${formatBytes(bucketTotal(inventory))}${inventory.complete ? "" : " (first 20,000 files)"}` : inventory.state === "unconfigured" ? "Not configured" : "Could not be read";

  return (
    <PageFrame className="ui-stack">
      <PageIntro
        title="Storage"
        description="How much space the site uses in the site database and the file buckets, with tools to remove unused files and compress every image."
        meta={<Link href={adminHref("/backups")}>Database backups →</Link>}
      />
      {notice ? <Notice tone={notice.tone} role={notice.tone === "success" ? "status" : "alert"}>{notice.text}</Notice> : null}
      {!serviceReady ? <Notice tone="danger" role="alert">The storage service key is not set in the hosting environment, so the database size and storage jobs are unavailable.</Notice> : null}
      {r2Missing.length ? <Notice tone="warning" role="status">File storage is not configured in the hosting environment yet (missing {r2Missing.join(", ")}). The chart shows the database only until these are added.</Notice> : null}

      <Panel className="ui-stack">
        <SectionHeading title="Storage used" description={`${formatBytes(total)} in total. Files live in the file buckets, not in the database.`} />
        <div className={styles.chartRow}>
          <figure className={styles.chart} aria-label={`Storage used: ${slices.filter((slice) => slice.bytes > 0).map((slice) => `${slice.label} ${formatBytes(slice.bytes)}`).join(", ")}`}>
            <svg viewBox="0 0 200 200" role="img" aria-hidden="true">
              {paths.length ? paths.map((slice) => <path key={slice.label} d={slice.path} fill={slice.color}><title>{`${slice.label}: ${formatBytes(slice.bytes)} (${(slice.share * 100).toFixed(1)}%)`}</title></path>) : <circle cx="100" cy="100" r="72" fill="none" stroke="hsl(var(--border))" strokeWidth="36" />}
            </svg>
            <figcaption className={styles.centre}><strong>{formatBytes(total)}</strong><span>used</span></figcaption>
          </figure>
          <ul className={styles.legend}>
            {slices.map((slice) => (
              <li key={slice.key}>
                <span className={styles.swatch} style={{ background: slice.color }} aria-hidden="true" />
                <span className={styles.legendLabel}>{slice.label}{slice.count ? <small>{slice.count.toLocaleString("en-NG")} file{slice.count === 1 ? "" : "s"}</small> : null}</span>
                <span className={styles.legendValue}>{formatBytes(slice.bytes)}<small>{total ? `${((slice.bytes / total) * 100).toFixed(1)}%` : "—"}</small></span>
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.meters}>
          <div className={styles.meter}>
            <p><strong>Site database</strong><span>{formatBytes(databaseBytes)} of {formatBytes(SUPABASE_FREE_BYTES)} free plan</span></p>
            <div className={styles.bar}><span style={{ width: `${Math.min(100, (databaseBytes / SUPABASE_FREE_BYTES) * 100)}%`, background: COLORS.database }} /></div>
          </div>
          <div className={styles.meter}>
            <p><strong>File storage</strong><span>{r2Ready ? `${formatBytes(r2Bytes)} in ${r2Objects.toLocaleString("en-NG")} files of ${formatBytes(R2_FREE_BYTES)} free` : "Not available"}</span></p>
            <div className={styles.bar}><span style={{ width: `${Math.min(100, (r2Bytes / R2_FREE_BYTES) * 100)}%`, background: COLORS.covers }} /></div>
          </div>
        </div>
        <dl className={styles.facts}>
          <div><dt>Public bucket</dt><dd>{bucketNote(publicBucket)}</dd></div>
          <div><dt>Private bucket</dt><dd>{bucketNote(privateBucket)}</dd></div>
          <div><dt>Saved by compression so far</dt><dd>{formatBytes(savedTotal)}</dd></div>
          <div><dt>Largest tables</dt><dd>{tables.slice(0, 4).map((table) => `${table.name} ${formatBytes(table.bytes)}`).join(" · ") || "—"}</dd></div>
        </dl>
      </Panel>

      <div className={styles.tools}>
        <Panel className="ui-stack">
          <SectionHeading title="Empty the bucket" description="Removes every uploaded file that nothing on the site uses. News articles and their images stay: every article (including older versions and inline images), business, person, event, history record, tourism entry, site page, profile and media-library item is checked first." />
          <ul className={styles.rules}>
            <li>Only site uploads (<code>media/…</code>) are considered — database backups are never touched.</li>
            <li>Files uploaded in the last 24 hours stay, in case a form is still being filled in.</li>
            <li>If the check cannot run, nothing is deleted.</li>
            <li>AI news covers are linked from the outlet, so they never live in the file buckets and cannot be affected.</li>
          </ul>
          {latestCheck ? <p className="ui-meta" style={{ margin: 0 }}>Last {latestCheck.scope.endsWith(":check") ? "check" : "cleanup"} ({lagosExact(latestCheck.started_at)}): {latestCheck.progress}</p> : null}
          <form action={removeUnusedFiles} className={styles.actions}>
            <label className={styles.field}><span>Buckets</span>
              <select className="input" name="scope" defaultValue="both">
                <option value="both">Public and private</option>
                <option value="public">Public only</option>
                <option value="private">Private only</option>
              </select>
            </label>
            <input type="hidden" name="confirm" value="REMOVE" />
            <SubmitButton variant="secondary" useLegacyClasses formAction={checkUnusedFiles} pendingLabel="Starting…" disabled={running || !r2Ready}>Check what would go</SubmitButton>
            {running || !r2Ready
              ? <button type="button" className="btn-danger" disabled>Remove unused files</button>
              : <ConfirmSubmit className="btn-danger" confirmLabel="Remove unused files" message="Delete every uploaded file that no article, page, listing or profile uses? Files in use, files from the last 24 hours and database backups stay. This cannot be undone.">Remove unused files</ConfirmSubmit>}
          </form>
        </Panel>

        <Panel className="ui-stack">
          <SectionHeading title="Compress everything" description="Re-encodes every stored image as small as it will go while it still looks clean: WebP quality 55, best encoder, covers and page photos up to 1600 px, logos, avatars and portraits up to 1024 px. Each file keeps its address, so no link or page changes." />
          <ul className={styles.rules}>
            <li>Images that would shrink by less than 5% are left as they are.</li>
            <li>Already-compressed images are skipped next time.</li>
            <li>Large libraries finish over several presses (about 4 minutes each).</li>
          </ul>
          <form action={compressAllImages} className={styles.actions}>
            <label className={styles.field}><span>Buckets</span>
              <select className="input" name="scope" defaultValue="both">
                <option value="both">Public and private</option>
                <option value="public">Public only</option>
                <option value="private">Private only</option>
              </select>
            </label>
            <SubmitButton useLegacyClasses pendingLabel="Starting…" disabled={running || !r2Ready}>Compress everything</SubmitButton>
          </form>
        </Panel>
      </div>

      <Panel className="ui-stack">
        <SectionHeading title="Storage jobs" description="Live progress of cleanups and compressions." />
        <LiveRefresh active={running} />
        {jobs.length ? (
          <ul className={styles.jobs}>
            {jobs.map((job) => (
              <li key={job.id} className={styles.job}>
                <div className={styles.jobHead}>
                  <strong>{jobTitle(job)}</strong>
                  <StatusBadge tone={statusTone(job.status)}>{job.status === "running" ? "Running" : job.status === "partial" ? "Partly done" : job.status === "success" ? "Done" : "Failed"}</StatusBadge>
                </div>
                <p>{job.progress ?? "—"}</p>
                <p className="ui-meta">{lagosExact(job.started_at)} · {job.scope.replace(":check", "").replace("+", " and ")} bucket{job.scope.includes("+") ? "s" : ""}{Array.isArray(job.stats.sample) && job.stats.sample.length ? ` · e.g. ${(job.stats.sample as string[]).slice(0, 3).join(", ")}` : ""}</p>
              </li>
            ))}
          </ul>
        ) : <p className="ui-meta" style={{ margin: 0 }}>No storage jobs yet.</p>}
      </Panel>
    </PageFrame>
  );
}
