import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame, PageIntro, Panel, SectionHeading, EmptyPanel } from "@epelawa/ui";
import { createStaffClient } from "../../../../lib/supabase";
import { adminHref } from "../../../../lib/admin-path";
import CopyButton from "../../../../components/copy-button";

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
  return new Date(dateString).toLocaleString("en-NG");
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
  const { data, error } = await db
    .from("cron_job_history")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(200);

  const records = (data ?? []) as CronJobRecord[];
  
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
          eyebrow="Endpoints"
          title="Cron Job URLs for cronjob.org"
        />
        <div className="ui-stack-sm">
          <p className="ui-meta">
            Copy these endpoints to use with <strong>cronjob.org</strong> or any other cron service.
            For authenticated endpoints, make sure to include the <code>x-cron-secret</code> header with your <code>CRON_SECRET</code> value.
          </p>
          <div className="ui-form-grid">
            <label className="ui-field">
              <span className="label">Database Ping (Run 1-2 times/day)</span>
              <div className="ui-row gap-2">
                <code className="input font-mono text-sm p-2 bg-gray-100 rounded">POST https://epelawa.vercel.app/api/cron/database-ping</code>
                <CopyButton text="https://epelawa.vercel.app/api/cron/database-ping" />
              </div>
              <span className="ui-meta">Requires: <code>x-cron-secret</code> header</span>
            </label>
            <label className="ui-field">
              <span className="label">Health Check (Public)</span>
              <div className="ui-row gap-2">
                <code className="input font-mono text-sm p-2 bg-gray-100 rounded">GET https://epelawa.vercel.app/api/health</code>
                <CopyButton text="https://epelawa.vercel.app/api/health" />
              </div>
              <span className="ui-meta">Public endpoint - no authentication needed</span>
            </label>
          </div>
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
          description="Cron jobs have not been executed yet. Jobs will appear here once they run."
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
