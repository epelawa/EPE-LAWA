import type { Metadata } from "next";
import Link from "../../../../components/admin-link";
import { PageFrame, PageIntro, Panel, SectionHeading, EmptyPanel } from "@epelawa/ui";
import { createStaffClient } from "../../../../lib/supabase";
import { adminHref } from "../../../../lib/admin-path";
import CopyButton from "../../../../components/copy-button";
import SecretField from "../../../../components/secret-field";
import { cronAccessToken } from "../../../../../main/lib/cron-token";
import { absoluteUrl } from "../../../../lib/site";

export const metadata: Metadata = {
  title: "Cron Job History",
  robots: { index: false, follow: false },
};

type CronJobRecord = {
  id: string;
  job_name: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  details: unknown;
  error_message: string | null;
};

function formatDuration(ms: number | null): string {
  if (ms === null) return "N/A";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" });
}

function StatusBadge({ status }: { status: string }) {
  const tone = status === "success" ? "success" : 
               status === "failed" ? "danger" : 
               status === "timeout" ? "warning" : "neutral";
  return (
    <span className={`ui-badge ui-badge--${tone}`}>
      {status}
    </span>
  );
}

export default async function CronJobHistoryPage() {
  const db = await createStaffClient();
  const access = await db.rpc("has_capability", { p_capability: "audit.read" });
  if (access.error || access.data !== true) {
    return <PageFrame><PageIntro eyebrow="Settings · Cron" title="Cron Job History" description="Scheduled job history." />
      <EmptyPanel title={access.error ? "Access could not be verified" : "Access denied"}
        description="Cron history requires the audit.read capability."
        actions={<Link href={adminHref("/settings")}>Back to settings</Link>} />
    </PageFrame>;
  }
  const { data, error } = await db
    .from("cron_job_history")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(200);

  if (error) {
    return <PageFrame><PageIntro eyebrow="Settings · Cron" title="Cron Job History" description="Scheduled job history." />
      <EmptyPanel title="Cron history unavailable" description="Job records could not be loaded. Try again later."
        actions={<Link href={adminHref("/settings")}>Back to settings</Link>} />
    </PageFrame>;
  }
  const records = (data ?? []) as CronJobRecord[];
  // The token is a credential: only the primary administrators (same check as Settings) see it.
  const owner = await db.rpc("staff_roles_authorized");
  const canSeeToken = !owner.error && owner.data === true;
  const token = canSeeToken ? cronAccessToken() : null;
  const pingUrl = absoluteUrl("/api/cron/database-ping");
  const healthUrl = absoluteUrl("/api/health");
  
  // Get stats
  const stats = {
    total: records.length,
    success: records.filter(r => r.status === "success").length,
    failed: records.filter(r => r.status === "failed").length,
    timeout: records.filter(r => r.status === "timeout").length,
    started: records.filter(r => r.status === "started").length,
  };

  return (
    <PageFrame className="ui-stack">
      <PageIntro
        eyebrow="Settings · Cron"
        title="Cron Job History"
        description="View execution history of scheduled jobs including database pings and health checks."
        actions={
          <Link href={adminHref("/settings")} className="btn-secondary">
            Back to settings
          </Link>
        }
      />

      <Panel className="ui-subtle">
        <SectionHeading
          eyebrow="Connect"
          title="Set up cron-job.org"
          description="Paste these values into a new cron job. The token is filled in for you; nothing needs to be typed."
        />
        <div className="ui-stack-sm">
          <ol className="ui-list ui-stack-sm" style={{ paddingInlineStart: "1.25rem", listStyle: "decimal" }}>
            <li>
              <span className="label">URL</span>
              <div className="ui-row gap-2" style={{ flexWrap: "wrap", alignItems: "center" }}>
                <code className="input font-mono text-sm p-2 bg-gray-100 rounded" style={{ overflowWrap: "anywhere", flex: "1 1 260px", minWidth: 0 }}>{pingUrl}</code>
                <CopyButton text={pingUrl} />
              </div>
            </li>
            <li>
              <span className="label">Schedule</span>
              <p className="ui-meta">Once or twice a day (for example every day at 06:00 and 18:00).</p>
            </li>
            <li>
              <span className="label">Advanced → Request method</span>
              <p className="ui-meta"><code>POST</code></p>
            </li>
            <li>
              <span className="label">Advanced → Headers → Key</span>
              <div className="ui-row gap-2" style={{ flexWrap: "wrap", alignItems: "center" }}>
                <code className="input font-mono text-sm p-2 bg-gray-100 rounded">x-cron-secret</code>
                <CopyButton text="x-cron-secret" />
              </div>
            </li>
            <li>
              <span className="label">Advanced → Headers → Value</span>
              {!canSeeToken ? (
                <p className="ui-meta">Only the primary administrators can see the access token.</p>
              ) : token ? (
                <SecretField value={token} label="Cron access token" />
              ) : (
                <p className="ui-meta">No server secret is configured yet. Add <code>CRON_SECRET</code> (at least 16 characters) in Vercel → Settings → Environment Variables and redeploy; the token then appears here.</p>
              )}
            </li>
          </ol>
          <p className="ui-meta">
            Save, then use <strong>Test run</strong> on cron-job.org: a <code>200</code> response means it is authorised, and the run appears in the history below.
            A <code>401</code> means the header is missing or the value was changed.
            The token only works for the cron endpoints. Keep it private; if it leaks, change <code>CRON_SECRET</code> in Vercel and paste the new token.
          </p>
          <label className="ui-field">
            <span className="label">Health check (public, no token needed)</span>
            <div className="ui-row gap-2" style={{ flexWrap: "wrap", alignItems: "center" }}>
              <code className="input font-mono text-sm p-2 bg-gray-100 rounded" style={{ overflowWrap: "anywhere" }}>GET {healthUrl}</code>
              <CopyButton text={healthUrl} />
            </div>
          </label>
        </div>
      </Panel>

      <Panel className="ui-subtle">
        <SectionHeading
          eyebrow="Overview"
          title="Cron Job Statistics"
        />
        <div className="ui-grid ui-grid--4">
          <div className="ui-card">
            <p className="ui-eyebrow">Total Runs</p>
            <p className="text-4xl font-bold">{stats.total}</p>
          </div>
          <div className="ui-card">
            <p className="ui-eyebrow">Successful</p>
            <p className="text-4xl font-bold text-green-600">{stats.success}</p>
          </div>
          <div className="ui-card">
            <p className="ui-eyebrow">Failed</p>
            <p className="text-4xl font-bold text-red-600">{stats.failed}</p>
          </div>
          <div className="ui-card">
            <p className="ui-eyebrow">Timeouts</p>
            <p className="text-4xl font-bold text-yellow-600">{stats.timeout}</p>
          </div>
        </div>
      </Panel>

      <SectionHeading
        eyebrow="History"
        title="Recent Cron Job Executions"
        description="Showing the 200 most recent job runs"
      />

      {records.length === 0 ? (
        <EmptyPanel
          title="No cron job history"
          description="No job runs are recorded here yet."
        />
      ) : (
        <div className="ui-stack-sm">
          {records.map((record) => (
            <Panel key={record.id} className="ui-stack-sm">
              <div className="ui-row">
                <div className="ui-stack-sm">
                  <p className="ui-eyebrow">{record.job_name}</p>
                  <StatusBadge status={record.status} />
                </div>
                <span className="ui-meta">
                  {formatDate(record.started_at)}
                </span>
              </div>
              <div className="ui-grid ui-grid--2 ui-meta">
                <div>
                  <dt>Started</dt>
                  <dd>{formatDate(record.started_at)}</dd>
                </div>
                <div>
                  <dt>Completed</dt>
                  <dd>{formatDate(record.completed_at)}</dd>
                </div>
                <div>
                  <dt>Duration</dt>
                  <dd>{formatDuration(record.duration_ms)}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd><StatusBadge status={record.status} /></dd>
                </div>
              </div>
              {record.error_message && (
                <div className="ui-divider ui-meta">
                  <p><strong>Error:</strong> {record.error_message}</p>
                </div>
              )}
              {record.details !== null && typeof record.details === "object" && (
                <details className="ui-divider">
                  <summary className="ui-meta cursor-pointer">View details</summary>
                  <pre className="ui-meta text-sm overflow-auto">{JSON.stringify(record.details, null, 2)}</pre>
                </details>
              )}
            </Panel>
          ))}
        </div>
      )}

      <Panel className="ui-subtle">
        <SectionHeading
          eyebrow="Information"
          title="About Cron Jobs"
        />
        <div className="ui-stack-sm ui-meta">
          <p>
            <strong>Database Ping:</strong> Pings the database to verify connectivity. 
            Should be run 1-2 times per day to ensure the database is healthy.
          </p>
          <p>
            <strong>Health Check:</strong> General health check endpoint that verifies 
            the application is running correctly.
          </p>
          <p>
            <strong>Status Meanings:</strong>
          </p>
          <ul className="ui-list ui-meta">
            <li><StatusBadge status="success" /> Success - Job completed successfully</li>
            <li><StatusBadge status="failed" /> Failed - Job failed with an error</li>
            <li><StatusBadge status="timeout" /> Timeout - Job took too long to complete</li>
            <li><StatusBadge status="started" /> Started - Job is currently running</li>
          </ul>
        </div>
      </Panel>
    </PageFrame>
  );
}
