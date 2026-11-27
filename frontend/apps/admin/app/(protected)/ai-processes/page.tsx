import type { Metadata } from "next";
import Link from "../../../components/admin-link";
import { EmptyPanel, Notice, PageFrame, PageIntro, Panel, SectionHeading, StatusBadge, SubmitButton } from "@epelawa/ui";
import { createStaffClient } from "../../../lib/supabase";
import { adminHref } from "../../../lib/admin-path";
import { lagosClock, lagosDay, lagosDayRange, lagosExact, lagosHour } from "../../../lib/lagos-time";
import { resolveAiEscalation, sendApprovedAiReply } from "../../../lib/ai-actions";
import LiveRefresh from "../../../components/live-refresh";
import { hourLabel12h } from "../../../../main/lib/clock12";

export const metadata: Metadata = { title: "AI processes", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Activity = {
  id: number;
  run_id: string | null;
  created_at: string;
  job: string;
  action: string;
  outcome: "done" | "skipped" | "escalated" | "failed";
  resource_type: string | null;
  resource_id: string | null;
  title: string | null;
  reason: string | null;
  model: string | null;
  details: Record<string, unknown>;
  resolved_at: string | null;
  resolution_note: string | null;
};

const OUTCOMES = ["done", "escalated", "skipped", "failed"] as const;
const OUTCOME_LABEL: Record<Activity["outcome"], string> = { done: "Did", escalated: "Escalated to a human", skipped: "Did not do", failed: "Failed" };
const OUTCOME_TONE: Record<Activity["outcome"], "success" | "warning" | "neutral" | "danger"> = { done: "success", escalated: "warning", skipped: "neutral", failed: "danger" };
const JOBS: Record<string, string> = { news: "News", enquiries: "Enquiries", businesses: "Businesses", ads: "Ads", moderation: "Comments", admin_logs: "Admin logs", schedule: "Schedule" };

const notices: Record<string, { tone: "success" | "danger" | "warning"; text: string }> = {
  resolved: { tone: "success", text: "Escalation marked handled." },
  sent: { tone: "success", text: "The approved AI reply was emailed (with the AI assistant notice) and the enquiry resolved." },
  "send-failed": { tone: "danger", text: "The reply could not be emailed. Check the mail settings and try again." },
  note: { tone: "warning", text: "Write a short note (3+ characters) on how it was handled." },
  failed: { tone: "danger", text: "That action could not be completed. Refresh and try again." },
  denied: { tone: "danger", text: "Only the primary administrators can act on AI escalations." },
};

function resourceLink(row: Activity): { href: string; label: string } | null {
  if (!row.resource_id) return null;
  if (row.resource_type === "article") {
    const slug = typeof row.details.slug === "string" ? row.details.slug : null;
    return row.action === "news.publish" && slug ? { href: `/news/${slug}`, label: "Read the story" } : { href: adminHref(`/newsroom/${row.resource_id}`), label: "Open in Newsroom" };
  }
  if (row.resource_type === "business") return { href: adminHref("/business-review"), label: "Open Businesses" };
  if (row.resource_type === "private_enquiry") return { href: adminHref("/enquiries"), label: "Open Enquiries" };
  if (row.resource_type === "support_ticket" && row.resource_id) return { href: adminHref(`/support/${row.resource_id}`), label: "Open ticket" };
  if (row.resource_type === "comment") return { href: adminHref("/moderation/comments"), label: "Open Comments" };
  return null;
}

function Details({ row }: { row: Activity }) {
  const details = row.details ?? {};
  const sources = Array.isArray(details.sources) ? (details.sources as { outlet?: string; title?: string; url?: string }[]) : [];
  const rest = Object.fromEntries(Object.entries(details).filter(([key]) => !["sources", "reply", "subject"].includes(key)));
  return (
    <>
      {sources.length ? <ul className="ui-list">{sources.map((source) => <li key={source.url}>{source.outlet}: <a className="ui-text-link" href={source.url} rel="noopener noreferrer" target="_blank">{source.title}</a></li>)}</ul> : null}
      {typeof details.reply === "string" ? <blockquote style={{ whiteSpace: "pre-wrap", margin: 0, paddingLeft: 12, borderLeft: "3px solid hsl(var(--border))" }}><strong>{String(details.subject ?? "Drafted reply")}</strong>{"\n"}{details.reply}</blockquote> : null}
      {Object.keys(rest).length ? <details><summary>Technical details</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12 }}>{JSON.stringify(rest, null, 2)}</pre></details> : null}
    </>
  );
}

export default async function AiProcessesPage({ searchParams }: { searchParams: Promise<{ day?: string; job?: string; outcome?: string; result?: string }> }) {
  const db = await createStaffClient();
  const access = await db.rpc("staff_roles_authorized");
  if (access.error || access.data !== true) {
    return <PageFrame><PageIntro eyebrow="System · AI" title="AI processes" description="Audit of everything the AI did." />
      <EmptyPanel title={access.error ? "Access could not be verified" : "Primary administrators only"} description="The AI audit is restricted to the primary administrators." actions={<Link href={adminHref("/")}>Back to dashboard</Link>} />
    </PageFrame>;
  }
  const params = await searchParams;
  const today = lagosDay();
  const day = params.day && lagosDayRange(params.day) ? params.day : today;
  const range = lagosDayRange(day)!;
  const job = params.job && JOBS[params.job] ? params.job : "";
  const outcome = OUTCOMES.includes(params.outcome as Activity["outcome"]) ? (params.outcome as Activity["outcome"]) : "";
  const weekStart = new Date(Date.parse(range.until) - 7 * 24 * 3600_000).toISOString();

  let timelineQuery = db.from("ai_activity").select("id,run_id,created_at,job,action,outcome,resource_type,resource_id,title,reason,model,details,resolved_at,resolution_note").gte("created_at", range.since).lt("created_at", range.until).order("created_at", { ascending: false }).limit(500);
  if (job) timelineQuery = timelineQuery.eq("job", job);
  if (outcome) timelineQuery = timelineQuery.eq("outcome", outcome);
  const [timelineResult, weekResult, openResult, callsResult, runsResult] = await Promise.all([
    timelineQuery,
    db.from("ai_activity").select("created_at,outcome").gte("created_at", weekStart).lt("created_at", range.until).limit(10000),
    db.from("ai_activity").select("id,run_id,created_at,job,action,outcome,resource_type,resource_id,title,reason,model,details,resolved_at,resolution_note").eq("outcome", "escalated").is("resolved_at", null).order("created_at", { ascending: false }).limit(50),
    db.from("ai_model_calls").select("created_at,ok,model").gte("created_at", range.since).lt("created_at", range.until).limit(5000),
    db.from("ai_runs").select("id,job,trigger,started_at,finished_at,status,summary,progress,progress_at").gte("started_at", range.since).lt("started_at", range.until).order("started_at", { ascending: false }).limit(60),
  ]);
  const runs = (runsResult.data ?? []) as { id: string; job: string; trigger: string; started_at: string; finished_at: string | null; status: string; summary: string | null; progress: string | null; progress_at: string | null }[];
  const activeRuns = runs.filter((run) => run.status === "running" && Date.now() - Date.parse(run.progress_at ?? run.started_at) < 6 * 60_000);
  if (timelineResult.error) {
    return <PageFrame><PageIntro eyebrow="System · AI" title="AI processes" description="Audit of everything the AI did." />
      <EmptyPanel title="AI audit unavailable" description="Apply the AI database migration (20261129080000), then reload." />
    </PageFrame>;
  }
  const timeline = (timelineResult.data ?? []) as Activity[];
  const open = (openResult.data ?? []) as Activity[];
  const calls = callsResult.data ?? [];

  const days = new Map<string, Record<Activity["outcome"], number>>();
  // Newest first: the selected day and the six before it (Lagos calendar days).
  for (let index = 0; index < 7; index += 1) days.set(lagosDay(new Date(Date.parse(range.since) - index * 24 * 3600_000)), { done: 0, skipped: 0, escalated: 0, failed: 0 });
  for (const row of weekResult.data ?? []) {
    const bucket = days.get(lagosDay(String(row.created_at)));
    if (bucket) bucket[row.outcome as Activity["outcome"]] += 1;
  }
  const hours = Array.from({ length: 24 }, () => ({ done: 0, skipped: 0, escalated: 0, failed: 0, calls: 0, failedCalls: 0 }));
  for (const row of timeline) hours[lagosHour(row.created_at)][row.outcome] += 1;
  for (const call of calls) {
    const hour = hours[lagosHour(String(call.created_at))];
    hour.calls += 1;
    if (!call.ok) hour.failedCalls += 1;
  }
  const totals = timeline.reduce((sum, row) => ({ ...sum, [row.outcome]: sum[row.outcome] + 1 }), { done: 0, skipped: 0, escalated: 0, failed: 0 } as Record<Activity["outcome"], number>);
  const notice = params.result ? notices[params.result] : null;

  return (
    <PageFrame className="ui-stack">
      <PageIntro eyebrow="System · AI" title="AI processes" description="A complete audit of the AI desk: what it did, what it decided not to do, what it escalated to a human and why, with exact Lagos timestamps, by day and by hour." meta={<Link href={adminHref("/ai-scheduler")}>← AI Scheduler</Link>} />
      {notice ? <Notice tone={notice.tone} role={notice.tone === "success" ? "status" : "alert"}>{notice.text}</Notice> : null}

      <Panel className="ui-stack-sm">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Running now ({activeRuns.length})</h2>
          <LiveRefresh active={activeRuns.length > 0} seconds={5} />
        </div>
        {activeRuns.length === 0 ? <p className="ui-muted" style={{ margin: 0 }}>Nothing is running. Click any run below to see exactly what it did.</p> : activeRuns.map((run) => (
          <a key={run.id} href={adminHref(`/ai-processes/runs/${run.id}`)} className="ui-item" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            <p className="ui-meta" style={{ margin: 0 }}><StatusBadge tone="warning">running</StatusBadge> {JOBS[run.job] ?? run.job} · started {lagosClock(run.started_at)}</p>
            <p style={{ margin: "4px 0 0", fontWeight: 600 }}>{run.progress ?? "Starting…"}</p>
            <span className="ui-text-link">Watch live →</span>
          </a>
        ))}
      </Panel>

      <Panel className="ui-stack-sm">
        <SectionHeading title={`Runs on ${day} (${runs.length})`} description="Click a run to open its step-by-step view." />
        {runs.length === 0 ? <p className="ui-muted">No runs on this day.</p> : (
          <div className="ui-table"><table><thead><tr><th>Started</th><th>Job</th><th>Status</th><th>Result</th><th><span className="sr-only">Open</span></th></tr></thead><tbody>
            {runs.map((run) => <tr key={run.id}><td className="ui-number"><a href={adminHref(`/ai-processes/runs/${run.id}`)}>{lagosClock(run.started_at)}</a></td><td>{JOBS[run.job] ?? run.job}{run.trigger === "manual" ? " · Run now" : ""}</td><td><StatusBadge tone={run.status === "success" ? "success" : run.status === "failed" ? "danger" : run.status === "skipped" ? "neutral" : "warning"}>{run.status}</StatusBadge></td><td>{run.status === "running" ? run.progress ?? "Starting…" : run.summary ?? "—"}</td><td><a className="ui-text-link" href={adminHref(`/ai-processes/runs/${run.id}`)}>{run.status === "running" ? "Watch live" : "Details"}</a></td></tr>)}
          </tbody></table></div>
        )}
      </Panel>

      <Panel className="ui-stack">
        <SectionHeading title={`Waiting for a human (${open.length})`} description="Escalations stay here until someone handles them. The AI will not act on these items again until they are resolved." />
        {open.length === 0 ? <p className="ui-muted">Nothing is waiting. 🎉</p> : open.map((row) => {
          const link = resourceLink(row);
          return (
            <article className="ui-item ui-stack-sm" key={row.id}>
              <p className="ui-meta"><StatusBadge tone="warning">Escalated</StatusBadge> {JOBS[row.job] ?? row.job} · <time dateTime={row.created_at}>{lagosExact(row.created_at)}</time>{row.model ? ` · ${row.model}` : ""}</p>
              <h3>{row.title ?? row.action}</h3>
              <p><strong>Why:</strong> {row.reason ?? "—"}</p>
              <Details row={row} />
              <div className="ui-actions" style={{ flexWrap: "wrap", gap: 10 }}>
                {link ? <a className="btn-secondary" href={link.href}>{link.label}</a> : null}
                {row.action === "enquiry.escalate" && typeof row.details.reply === "string" ? (
                  <form action={sendApprovedAiReply} className="ui-stack-sm" style={{ flex: "1 1 100%" }}>
                    <input type="hidden" name="id" value={row.id} />
                    <label className="ui-field"><span className="label">Reply to send (edit if needed; the email still says the AI assistant wrote it)</span><textarea className="input" name="reply" rows={6} defaultValue={row.details.reply} maxLength={2500} /></label>
                    <SubmitButton className="btn-primary" useLegacyClasses pendingLabel="Sending…">Approve and send reply</SubmitButton>
                  </form>
                ) : null}
              </div>
              <form action={resolveAiEscalation} className="ui-toolbar">
                <input type="hidden" name="id" value={row.id} />
                <label className="ui-field"><span className="label">How was it handled?</span><input className="input" name="note" required minLength={3} maxLength={1000} placeholder="e.g. Published after editing the headline" /></label>
                <SubmitButton className="btn-secondary" useLegacyClasses pendingLabel="Saving…">Mark handled</SubmitButton>
              </form>
            </article>
          );
        })}
      </Panel>

      <Panel className="ui-stack">
        <SectionHeading title="Last 7 days" />
        <div className="ui-table"><table><thead><tr><th>Day (WAT)</th><th>Did</th><th>Escalated</th><th>Did not do</th><th>Failed</th></tr></thead><tbody>
          {[...days.entries()].map(([key, counts]) => <tr key={key}><td><Link href={`${adminHref("/ai-processes")}?day=${key}`}>{key}{key === today ? " (today)" : ""}</Link></td><td className="ui-number">{counts.done}</td><td className="ui-number">{counts.escalated}</td><td className="ui-number">{counts.skipped}</td><td className="ui-number">{counts.failed}</td></tr>)}
        </tbody></table></div>
      </Panel>

      <form className="ui-toolbar" method="get">
        <label className="ui-field"><span className="label">Day</span><input className="input" type="date" name="day" defaultValue={day} max={today} /></label>
        <label className="ui-field"><span className="label">Area</span><select className="input" name="job" defaultValue={job}><option value="">All</option>{Object.entries(JOBS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="ui-field"><span className="label">Outcome</span><select className="input" name="outcome" defaultValue={outcome}><option value="">All</option>{OUTCOMES.map((key) => <option key={key} value={key}>{OUTCOME_LABEL[key]}</option>)}</select></label>
        <button className="btn-secondary" type="submit">Show</button>
      </form>

      <Panel className="ui-stack">
        <SectionHeading title={`Hour by hour · ${day}`} description={`Did ${totals.done} · escalated ${totals.escalated} · did not do ${totals.skipped} · failed ${totals.failed} · ${calls.length} model requests (${calls.filter((call) => !call.ok).length} failed and retried on another model).`} />
        <div className="ui-table"><table><thead><tr><th>Hour (WAT)</th><th>Did</th><th>Escalated</th><th>Did not do</th><th>Failed</th><th>Model requests</th></tr></thead><tbody>
          {hours.map((hour, index) => hour.done + hour.skipped + hour.escalated + hour.failed + hour.calls === 0 ? null : <tr key={index}><td className="ui-number">{hourLabel12h(index)} – {hourLabel12h(index + 1)}</td><td className="ui-number">{hour.done}</td><td className="ui-number">{hour.escalated}</td><td className="ui-number">{hour.skipped}</td><td className="ui-number">{hour.failed}</td><td className="ui-number">{hour.calls}{hour.failedCalls ? ` (${hour.failedCalls} failed)` : ""}</td></tr>)}
        </tbody></table></div>
        {hours.every((hour) => hour.done + hour.skipped + hour.escalated + hour.failed + hour.calls === 0) ? <p className="ui-muted">No AI activity on this day.</p> : null}
      </Panel>

      <Panel className="ui-stack">
        <SectionHeading title={`Everything on ${day}`} description="Newest first. Times are exact to the second." />
        {timeline.length === 0 ? <p className="ui-muted">No entries for these filters.</p> : timeline.map((row) => {
          const link = resourceLink(row);
          return (
            <article className="ui-item ui-stack-sm" key={row.id}>
              <p className="ui-meta"><time dateTime={row.created_at} className="ui-number">{lagosClock(row.created_at)}</time> · <StatusBadge tone={OUTCOME_TONE[row.outcome]}>{OUTCOME_LABEL[row.outcome]}</StatusBadge> · {JOBS[row.job] ?? row.job} · <code>{row.action}</code>{row.model ? ` · model ${row.model}` : ""}</p>
              <h3>{row.title ?? row.action}</h3>
              {row.reason ? <p><strong>{row.outcome === "done" ? "What and why:" : "Why:"}</strong> {row.reason}</p> : null}
              {row.resolved_at ? <p className="ui-muted">Handled {lagosExact(row.resolved_at)}: {row.resolution_note}</p> : null}
              <Details row={row} />
              <p style={{ display: "flex", gap: 16, flexWrap: "wrap", margin: 0 }}>{link ? <a className="ui-text-link" href={link.href}>{link.label}</a> : null}{row.run_id ? <a className="ui-text-link" href={adminHref(`/ai-processes/runs/${row.run_id}`)}>See the whole run</a> : null}</p>
            </article>
          );
        })}
      </Panel>
    </PageFrame>
  );
}
