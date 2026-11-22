import { createStaffClient } from "../../../../lib/supabase";
import { resolveForumReport } from "./actions";
import { EmptyPanel, Notice, PageFrame, PageIntro, Panel, SectionHeading, StatusBadge } from "@epelawa/ui";
import type { ReactNode } from "react";

type Report = {
  id: string; reason: string; note: string | null; created_at: string;
  post: { id: string; body: string; state: string; thread: { title: string } | null } | null;
};

function QueuePage({ children }: { children: ReactNode }) {
  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="Staff tools · Forum" title="Forum moderation" description="Review open member reports and record a resolution. Reporter identities are not shown." />
    {children}
  </PageFrame>;
}

export default async function ForumModerationPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  const supabase = await createStaffClient();

  const capability = await supabase.rpc("has_capability", { p_capability: "moderation.review" });
  if (capability.error) return <QueuePage><Notice tone="danger" role="alert"><SectionHeading title="Unable to verify access" description="Try again shortly. No report data has been displayed." /></Notice></QueuePage>;
  if (capability.data !== true) return <QueuePage><Notice tone="danger" role="alert"><SectionHeading title="Access denied" description="Your staff account does not have the moderation.review capability." /></Notice></QueuePage>;

  // The database policy independently limits this result to staff with moderation.review. Select no reporter/member identifiers.
  const { data, error } = await supabase.from("forum_reports").select(`id, reason, note, created_at, post:post_id(id, body, state, thread:thread_id(title))`).eq("state", "open").order("created_at", { ascending: true }).limit(200);
  if (error) return <QueuePage><Notice tone="danger" role="alert"><SectionHeading title="Error loading reports" description="The moderation queue could not be loaded. Please retry; no action was taken." /></Notice></QueuePage>;
  const reports = (data ?? []) as unknown as Report[];
  const { result } = await searchParams;
  return <QueuePage>
    {result === "failed" ? <Notice tone="danger" role="alert">Resolution failed. The report remains unchanged; check its status and try again.</Notice> : result === "saved" ? <Notice tone="success" role="status">Report resolution recorded.</Notice> : null}
    <Panel>
      <SectionHeading eyebrow="Open queue" title="Reports awaiting review" description={`${reports.length} open ${reports.length === 1 ? "report" : "reports"} · oldest first`} />
      {reports.length === 0 ? <EmptyPanel title="No open reports" description="There are no reports awaiting review." /> : <div className="ui-stack-sm" aria-label="Open forum reports">
        {reports.map((report) => <article key={report.id} className="ui-item ui-stack-sm" aria-labelledby={`report-${report.id}`}>
          <div className="ui-row">
            <div className="ui-stack-sm">
              <h3 className="ui-item-title" id={`report-${report.id}`}>Reported post</h3>
              <div className="ui-meta"><span>Thread: {report.post?.thread?.title ?? "Unavailable thread"}</span><span aria-hidden="true">·</span><span>Reported <time dateTime={report.created_at}>{new Date(report.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</time></span></div>
            </div>
            <StatusBadge tone="warning">{report.reason}</StatusBadge>
          </div>
          <blockquote className="ui-subtle">{report.post?.body ?? "Post content is unavailable."}</blockquote>
          {report.note ? <p><strong>Reporter note:</strong> {report.note}</p> : null}
          <div className="ui-meta"><span>Post state: {report.post?.state ?? "unknown"}</span></div>
          <form action={resolveForumReport} className="ui-stack-sm">
            <input type="hidden" name="reportId" value={report.id} />
            <div className="ui-form-grid">
              <div className="ui-field"><label className="label" htmlFor={`action-${report.id}`}>Resolution</label><select className="input" id={`action-${report.id}`} name="action" defaultValue="dismiss"><option value="dismiss">Dismiss report</option><option value="hide">Hide post</option><option value="restore">Restore post</option></select></div>
              <div className="ui-field"><label className="label" htmlFor={`reason-${report.id}`}>Staff reason (required, at least 5 characters)</label><textarea className="input" id={`reason-${report.id}`} name="resolutionReason" required minLength={5} maxLength={1000} rows={3} /></div>
            </div>
            <div className="ui-actions"><button type="submit" className="btn-primary">Record resolution</button></div>
          </form>
        </article>)}
      </div>}
    </Panel>
  </QueuePage>;
}
