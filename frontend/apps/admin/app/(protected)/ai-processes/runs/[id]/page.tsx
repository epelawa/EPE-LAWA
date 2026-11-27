import type { Metadata } from "next";
import Link from "../../../../../components/admin-link";
import LiveRefresh from "../../../../../components/live-refresh";
import { EmptyPanel, PageFrame, PageIntro, Panel, SectionHeading, StatusBadge } from "@epelawa/ui";
import { createStaffClient } from "../../../../../lib/supabase";
import { adminHref } from "../../../../../lib/admin-path";
import { lagosClock, lagosExact } from "../../../../../lib/lagos-time";
import { AI_JOB_LABELS } from "../../../../../../main/lib/ai/runner";

export const metadata: Metadata = { title: "AI run", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Run = { id: string; job: string; trigger: string; started_at: string; finished_at: string | null; status: string; summary: string | null; stats: Record<string, unknown>; progress: string | null; progress_at: string | null; steps: { at: string; text: string }[] | null };
type Activity = { id: number; created_at: string; action: string; outcome: "done" | "skipped" | "escalated" | "failed"; title: string | null; reason: string | null; model: string | null; resource_type: string | null; resource_id: string | null; details: Record<string, unknown> };
type Call = { id: number; created_at: string; model: string; ok: boolean; http_status: number | null; latency_ms: number | null; error: string | null };

const OUTCOME: Record<Activity["outcome"], { label: string; tone: "success" | "warning" | "neutral" | "danger" }> = {
  done: { label: "Did", tone: "success" },
  escalated: { label: "Sent to a human", tone: "warning" },
  skipped: { label: "Did not do", tone: "neutral" },
  failed: { label: "Failed", tone: "danger" },
};

function statusTone(status: string): "success" | "warning" | "danger" | "neutral" {
  return status === "success" ? "success" : status === "failed" ? "danger" : status === "partial" || status === "running" ? "warning" : "neutral";
}

function duration(from: string, to: string | null): string {
  const seconds = Math.max(0, Math.round(((to ? Date.parse(to) : Date.now()) - Date.parse(from)) / 1000));
  return seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}

function link(row: Activity): { href: string; label: string } | null {
  if (row.resource_type === "article" && row.resource_id) {
    const slug = typeof row.details?.slug === "string" ? row.details.slug : null;
    return row.action === "news.publish" && slug ? { href: `/news/${slug}`, label: "Read the story" } : { href: adminHref(`/newsroom/${row.resource_id}`), label: "Open in Newsroom" };
  }
  if (row.resource_type === "private_enquiry") return { href: adminHref("/enquiries"), label: "Open Enquiries" };
  if (row.resource_type === "support_ticket" && row.resource_id) return { href: adminHref(`/support/${row.resource_id}`), label: "Open ticket" };
  if (row.resource_type === "business") return { href: adminHref("/business-review"), label: "Open Businesses" };
  if (row.resource_type === "comment") return { href: adminHref("/moderation/comments"), label: "Open Comments" };
  return null;
}

export default async function AiRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createStaffClient();
  const access = await db.rpc("staff_roles_authorized");
  if (access.error || access.data !== true) {
    return <PageFrame><PageIntro eyebrow="System · AI" title="AI run" description="Live view of one AI run." />
      <EmptyPanel title="Primary administrators only" description="The AI audit is restricted to the primary administrators." actions={<Link href={adminHref("/")}>Back to dashboard</Link>} />
    </PageFrame>;
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return <PageFrame><PageIntro eyebrow="System · AI" title="AI run" description="Live view of one AI run." /><EmptyPanel title="Run not found" description="This link is not a valid run." actions={<Link href={adminHref("/ai-processes")}>Back to AI processes</Link>} /></PageFrame>;
  }
  const [runResult, activityResult, callsResult] = await Promise.all([
    db.from("ai_runs").select("id,job,trigger,started_at,finished_at,status,summary,stats,progress,progress_at,steps").eq("id", id).maybeSingle(),
    db.from("ai_activity").select("id,created_at,action,outcome,title,reason,model,resource_type,resource_id,details").eq("run_id", id).order("created_at", { ascending: true }).limit(200),
    db.from("ai_model_calls").select("id,created_at,model,ok,http_status,latency_ms,error").eq("run_id", id).order("created_at", { ascending: true }).limit(200),
  ]);
  const run = runResult.data as Run | null;
  if (!run) {
    return <PageFrame><PageIntro eyebrow="System · AI" title="AI run" description="Live view of one AI run." /><EmptyPanel title="Run not found" description={runResult.error ? "The run could not be read. Apply the latest AI migration and reload." : "This run does not exist or was removed."} actions={<Link href={adminHref("/ai-processes")}>Back to AI processes</Link>} /></PageFrame>;
  }
  const activity = (activityResult.data ?? []) as Activity[];
  const calls = (callsResult.data ?? []) as Call[];
  const steps = Array.isArray(run.steps) ? run.steps : [];
  const running = run.status === "running";
  const quiet = running && run.progress_at ? Date.now() - Date.parse(run.progress_at) : 0;
  const stale = running && quiet > 6 * 60_000;
  const label = AI_JOB_LABELS[run.job as keyof typeof AI_JOB_LABELS] ?? run.job;

  return (
    <PageFrame className="ui-stack">
      <PageIntro eyebrow="System · AI · Run" title={label} description={`${run.trigger === "manual" ? "Started with Run now" : "Scheduled run"} at ${lagosExact(run.started_at)}.`} meta={<span style={{ display: "flex", gap: 16, flexWrap: "wrap" }}><Link href={adminHref("/ai-processes")}>← AI processes</Link><Link href={adminHref("/ai-scheduler")}>AI Scheduler</Link></span>} />

      <Panel className="ui-stack-sm" aria-live="polite">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
          <p style={{ margin: 0, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <StatusBadge tone={stale ? "danger" : statusTone(run.status)}>{stale ? "not responding" : running ? "running now" : run.status}</StatusBadge>
            <span className="ui-number">{running ? `Running for ${duration(run.started_at, null)}` : `Took ${duration(run.started_at, run.finished_at)}`}</span>
            <span className="ui-meta">{calls.length} model request{calls.length === 1 ? "" : "s"} · {activity.length} result{activity.length === 1 ? "" : "s"}</span>
          </p>
          <LiveRefresh active={running && !stale} />
        </div>
        {running ? (
          <div style={{ padding: "14px 16px", borderRadius: 14, background: "hsl(var(--secondary))" }}>
            <p className="ui-meta" style={{ margin: 0 }}>Doing now{run.progress_at ? ` · since ${lagosClock(run.progress_at)}` : ""}</p>
            <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 600 }}>{run.progress ?? "Starting…"}</p>
            {stale ? <p className="ui-meta" style={{ margin: "6px 0 0" }}>No progress for over 6 minutes; the server probably stopped this run (time limit). The next pass marks it failed.</p> : null}
          </div>
        ) : (
          <p style={{ margin: 0 }}><strong>Result:</strong> {run.summary ?? "—"}</p>
        )}
      </Panel>

      <Panel className="ui-stack">
        <SectionHeading title="Step by step" description="Everything this run did, in order (Lagos time)." />
        {steps.length === 0 ? <p className="ui-muted">{running ? "Waiting for the first step…" : "This run finished before step tracking was added."}</p> : (
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 0 }}>
            {steps.map((step, index) => {
              const last = index === steps.length - 1;
              return (
                <li key={`${step.at}-${index}`} style={{ display: "grid", gridTemplateColumns: "84px 18px 1fr", gap: 10, alignItems: "start", padding: "8px 0", borderBottom: last ? "none" : "1px solid hsl(var(--border))" }}>
                  <time className="ui-number ui-meta" dateTime={step.at}>{lagosClock(step.at)}</time>
                  <span aria-hidden="true" style={{ marginTop: 6, width: 10, height: 10, borderRadius: 999, background: last && running ? "#16a34a" : /^Failed|failed after/.test(step.text) ? "#dc2626" : /^Sent to a human|^Skipped/.test(step.text) ? "#d97706" : "#94a3b8" }} />
                  <span style={{ overflowWrap: "anywhere" }}>{step.text}</span>
                </li>
              );
            })}
          </ol>
        )}
      </Panel>

      <Panel className="ui-stack">
        <SectionHeading title={`Results (${activity.length})`} description="What it did, did not do, or passed to a human, and why." />
        {activity.length === 0 ? <p className="ui-muted">{running ? "No results yet." : "No results were recorded."}</p> : activity.map((row) => {
          const target = link(row);
          return (
            <article key={row.id} className="ui-item ui-stack-sm">
              <p className="ui-meta" style={{ margin: 0 }}><StatusBadge tone={OUTCOME[row.outcome].tone}>{OUTCOME[row.outcome].label}</StatusBadge> <time dateTime={row.created_at}>{lagosClock(row.created_at)}</time>{row.model ? ` · ${row.model}` : ""}</p>
              <h3 style={{ margin: 0 }}>{row.title ?? row.action}</h3>
              {row.reason ? <p style={{ margin: 0 }}>{row.reason}</p> : null}
              {target ? <p style={{ margin: 0 }}><a className="ui-text-link" href={target.href}>{target.label}</a></p> : null}
            </article>
          );
        })}
      </Panel>

      <Panel className="ui-stack">
        <SectionHeading title={`Model requests (${calls.length})`} description="Every request to OpenRouter in this run. Failed ones count towards the daily free allowance too." />
        {calls.length === 0 ? <p className="ui-muted">No model requests{running ? " yet" : ""}.</p> : (
          <div className="ui-table"><table><thead><tr><th>Time</th><th>Model</th><th>Result</th><th>Took</th></tr></thead><tbody>
            {calls.map((call) => <tr key={call.id}><td className="ui-number">{lagosClock(call.created_at)}</td><td><code>{call.model}</code></td><td>{call.ok ? <StatusBadge tone="success">answered</StatusBadge> : <><StatusBadge tone="danger">failed</StatusBadge> {call.error ?? (call.http_status ? `HTTP ${call.http_status}` : "")}</>}</td><td className="ui-number">{call.latency_ms != null ? `${(call.latency_ms / 1000).toFixed(1)} s` : "—"}</td></tr>)}
          </tbody></table></div>
        )}
      </Panel>
    </PageFrame>
  );
}
