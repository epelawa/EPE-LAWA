import type { Metadata } from "next";
import Link from "../../../components/admin-link";
import { EmptyPanel, Notice, PageFrame, PageIntro, Panel, SectionHeading, StatusBadge, SubmitButton } from "@epelawa/ui";
import { createStaffClient } from "../../../lib/supabase";
import { adminHref } from "../../../lib/admin-path";
import { lagosClock, lagosDay, lagosDayRange, lagosExact } from "../../../lib/lagos-time";
import { explainAdminLogsNow } from "../../../lib/ai-actions";

export const metadata: Metadata = { title: "Admin logs", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type LogRow = {
  id: number; created_at: string; actor_id: string | null; actor_email: string | null; event: string; method: string | null; path: string | null; section: string | null;
  action_id: string | null; reason: string | null; ip: string | null; user_agent: string | null; device: string | null; browser: string | null; os: string | null;
  country: string | null; region: string | null; city: string | null; latitude: number | null; longitude: number | null; timezone: string | null; metadata: Record<string, unknown>;
};
type AuditRow = { id: number; created_at: string; actor_id: string | null; actor_email: string | null; actor_kind: string; action: string; resource_type: string; resource_id: string | null; outcome: string; metadata: Record<string, unknown> };
type SummaryRow = { id: number; actor_id: string | null; actor_email: string | null; period_start: string; period_end: string; summary: string; model: string | null; events: number };

const EVENT_LABEL: Record<string, string> = { login: "Signed in", login_failed: "Failed sign-in", logout: "Signed out", session_expired: "Timed out", page_view: "Opened page", action: "Submitted a form" };
const EVENT_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = { login: "success", login_failed: "danger", logout: "neutral", session_expired: "warning", page_view: "neutral", action: "warning" };

function place(row: LogRow): string {
  return [row.city, row.region, row.country].filter(Boolean).join(", ") || "Unknown location";
}

function auditReason(metadata: Record<string, unknown>): string | null {
  for (const key of ["reason", "note", "resolution", "p_note", "decision_note"]) {
    if (typeof metadata?.[key] === "string" && String(metadata[key]).trim()) return String(metadata[key]);
  }
  return null;
}

export default async function AdminLogsPage({ searchParams }: { searchParams: Promise<{ day?: string; actor?: string; view?: string; result?: string; summary?: string }> }) {
  const db = await createStaffClient();
  const access = await db.rpc("staff_roles_authorized");
  if (access.error || access.data !== true) {
    return <PageFrame><PageIntro eyebrow="System · Security" title="Logs" description="Administrator activity." />
      <EmptyPanel title={access.error ? "Access could not be verified" : "Primary administrators only"} description="The admin activity log is restricted to the primary administrators." actions={<Link href={adminHref("/")}>Back to dashboard</Link>} />
    </PageFrame>;
  }
  const params = await searchParams;
  const today = lagosDay();
  const day = params.day && lagosDayRange(params.day) ? params.day : today;
  const range = lagosDayRange(day)!;
  const actor = params.actor && /^[0-9a-f-]{36}$/i.test(params.actor) ? params.actor : "";
  const showViews = params.view === "all";

  let logQuery = db.from("admin_activity_log").select("*").gte("created_at", range.since).lt("created_at", range.until).order("created_at", { ascending: false }).limit(1000);
  if (actor) logQuery = logQuery.eq("actor_id", actor);
  let summaryQuery = db.from("admin_activity_summaries").select("id,actor_id,actor_email,period_start,period_end,summary,model,events").gte("period_start", new Date(Date.parse(range.since) - 6 * 3600_000).toISOString()).lt("period_start", range.until).order("period_start", { ascending: false }).limit(100);
  if (actor) summaryQuery = summaryQuery.eq("actor_id", actor);
  const [logsResult, auditResult, summariesResult, actorsResult] = await Promise.all([
    logQuery,
    db.rpc("admin_audit_feed", { p_since: range.since, p_until: range.until, p_actor: actor || null }),
    summaryQuery,
    db.from("admin_activity_log").select("actor_id,actor_email").not("actor_id", "is", null).order("created_at", { ascending: false }).limit(500),
  ]);
  if (logsResult.error) {
    return <PageFrame><PageIntro eyebrow="System · Security" title="Logs" description="Administrator activity." />
      <EmptyPanel title="Logs unavailable" description="Apply the database migration 20261129080000, then reload." />
    </PageFrame>;
  }
  const logs = (logsResult.data ?? []) as LogRow[];
  const audit = ((auditResult.data ?? []) as AuditRow[]).filter((row) => row.actor_kind === "staff");
  const summaries = (summariesResult.data ?? []) as SummaryRow[];
  const actors = [...new Map((actorsResult.data ?? []).map((row) => [String(row.actor_id), row.actor_email ? String(row.actor_email) : String(row.actor_id)])).entries()];
  const sessions = logs.filter((row) => ["login", "login_failed", "logout", "session_expired"].includes(row.event));
  type Entry = { at: string; key: string; who: string; kind: "log"; row: LogRow } | { at: string; key: string; who: string; kind: "audit"; row: AuditRow };
  const entries: Entry[] = [
    ...logs.filter((row) => showViews || row.event !== "page_view").filter((row) => !["login", "login_failed", "logout", "session_expired"].includes(row.event)).map((row) => ({ at: row.created_at, key: `l${row.id}`, who: row.actor_email ?? "unknown", kind: "log" as const, row })),
    ...audit.map((row) => ({ at: row.created_at, key: `a${row.id}`, who: row.actor_email ?? row.actor_id ?? "unknown", kind: "audit" as const, row })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const pageViews = logs.filter((row) => row.event === "page_view").length;
  const filterHref = (extra: Record<string, string>) => `${adminHref("/logs")}?${new URLSearchParams({ day, ...(actor ? { actor } : {}), ...extra }).toString()}`;

  return (
    <PageFrame className="ui-stack">
      <PageIntro eyebrow="System · Security" title="Logs" description="Every administrator sign-in, sign-out and action with the exact time, who did it, the reason given, and where from: IP address, device, browser, and the network’s city, region, country and approximate coordinates (from the hosting edge, no permission prompt). Members and visitors are not logged here." />
      {params.result === "explained" ? <Notice tone="success" role="status">{params.summary || "Explanations updated."}</Notice> : null}
      {params.result === "denied" ? <Notice tone="danger" role="alert">Only the primary administrators can run the explainer.</Notice> : null}

      <form className="ui-toolbar" method="get">
        <label className="ui-field"><span className="label">Day</span><input className="input" type="date" name="day" defaultValue={day} max={today} /></label>
        <label className="ui-field"><span className="label">Administrator</span><select className="input" name="actor" defaultValue={actor}><option value="">Everyone</option>{actors.map(([id, email]) => <option key={id} value={id}>{email}</option>)}</select></label>
        <label className="ui-row" style={{ gap: 8 }}><input type="checkbox" name="view" value="all" defaultChecked={showViews} style={{ width: 24, height: 24 }} /> Include page opens</label>
        <button className="btn-secondary" type="submit">Show</button>
      </form>

      <Panel className="ui-stack">
        <SectionHeading title="AI explanations" description="Hourly plain-English accounts of what each admin did, written by the AI from the raw events below. Raw events stay the record of truth." action={<form action={explainAdminLogsNow}><SubmitButton className="btn-secondary" useLegacyClasses pendingLabel="Explaining…">Explain the last 6 hours now</SubmitButton></form>} />
        {summaries.length === 0 ? <p className="ui-muted">No explanations for this day yet. They are written every hour while autopilot is on (with “Explain admin activity” allowed), or on demand with the button.</p> : summaries.map((summary) => (
          <article className="ui-item ui-stack-sm" key={summary.id}>
            <p className="ui-meta"><strong>{summary.actor_email ?? summary.actor_id}</strong> · {lagosExact(summary.period_start)} → {lagosClock(summary.period_end)} · {summary.events} events{summary.model ? ` · ${summary.model}` : ""}</p>
            <p style={{ whiteSpace: "pre-wrap" }}>{summary.summary}</p>
          </article>
        ))}
      </Panel>

      <Panel className="ui-stack">
        <SectionHeading title={`Sign-ins and sign-outs · ${day}`} description={`${sessions.length} session events.`} />
        {sessions.length === 0 ? <p className="ui-muted">No sign-in activity on this day.</p> : (
          <div className="ui-table"><table><thead><tr><th>Time (WAT)</th><th>Who</th><th>Event</th><th>Where</th><th>Device</th><th>IP</th></tr></thead><tbody>
            {sessions.map((row) => (
              <tr key={row.id}>
                <td className="ui-number">{lagosExact(row.created_at)}</td>
                <td>{row.actor_email ?? "—"}</td>
                <td><StatusBadge tone={EVENT_TONE[row.event] ?? "neutral"}>{EVENT_LABEL[row.event] ?? row.event}</StatusBadge>{row.reason ? <><br /><span className="ui-muted">{row.reason}</span></> : null}</td>
                <td>{place(row)}{row.latitude !== null && row.longitude !== null ? <><br /><a className="ui-text-link" href={`https://www.openstreetmap.org/?mlat=${row.latitude}&mlon=${row.longitude}#map=11/${row.latitude}/${row.longitude}`} target="_blank" rel="noopener noreferrer">{row.latitude.toFixed(4)}, {row.longitude.toFixed(4)}</a></> : null}{row.timezone ? <><br /><span className="ui-muted">{row.timezone}</span></> : null}</td>
                <td>{[row.device, row.browser, row.os].filter(Boolean).join(" · ") || "—"}{row.user_agent ? <details><summary className="ui-muted">User agent</summary><code style={{ overflowWrap: "anywhere", fontSize: 12 }}>{row.user_agent}</code></details> : null}</td>
                <td><code>{row.ip ?? "—"}</code></td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </Panel>

      <Panel className="ui-stack">
        <SectionHeading title={`Everything done · ${day}`} description={`${entries.length} entries${showViews ? "" : ` (${pageViews} page opens hidden — tick “Include page opens”)`}. Database actions come from the audited staff functions with the note or reason the admin entered.`} action={showViews ? <Link href={filterHref({})}>Hide page opens</Link> : <Link href={filterHref({ view: "all" })}>Show page opens</Link>} />
        {entries.length === 0 ? <p className="ui-muted">No admin activity on this day.</p> : (
          <div className="ui-table"><table><thead><tr><th>Time (WAT)</th><th>Who</th><th>What</th><th>Reason / note</th><th>Where · device</th></tr></thead><tbody>
            {entries.map((entry) => entry.kind === "log" ? (
              <tr key={entry.key}>
                <td className="ui-number">{lagosExact(entry.at)}</td>
                <td>{entry.who}</td>
                <td><StatusBadge tone={EVENT_TONE[entry.row.event] ?? "neutral"}>{EVENT_LABEL[entry.row.event] ?? entry.row.event}</StatusBadge> {entry.row.section}{entry.row.path ? <><br /><code style={{ fontSize: 12 }}>{entry.row.path}</code></> : null}{entry.row.metadata?.fields ? <details><summary className="ui-muted">Form fields</summary><pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{JSON.stringify(entry.row.metadata.fields, null, 2)}</pre></details> : null}</td>
                <td>{entry.row.reason ?? "—"}</td>
                <td>{place(entry.row)}<br /><span className="ui-muted">{[entry.row.device, entry.row.browser].filter(Boolean).join(" · ")}{entry.row.ip ? ` · ${entry.row.ip}` : ""}</span></td>
              </tr>
            ) : (
              <tr key={entry.key}>
                <td className="ui-number">{lagosExact(entry.at)}</td>
                <td>{entry.who}</td>
                <td><StatusBadge tone={entry.row.outcome === "success" ? "success" : "danger"}>{entry.row.action}</StatusBadge> {entry.row.resource_type}{entry.row.resource_id ? <><br /><code style={{ fontSize: 12 }}>{entry.row.resource_id}</code></> : null}<details><summary className="ui-muted">Details</summary><pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{JSON.stringify(entry.row.metadata ?? {}, null, 2)}</pre></details></td>
                <td>{auditReason(entry.row.metadata) ?? "—"}</td>
                <td className="ui-muted">Database action</td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </Panel>
    </PageFrame>
  );
}
