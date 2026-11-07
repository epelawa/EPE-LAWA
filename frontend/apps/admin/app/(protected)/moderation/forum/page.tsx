import { createClient } from "../../../../lib/supabase";
import { resolveForumReport } from "./actions";

type Report = {
  id: string; reason: string; note: string | null; created_at: string;
  post: { id: string; body: string; state: string; thread: { title: string } | null } | null;
};

export default async function ForumModerationPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  let supabase;
  try { supabase = await createClient(); }
  catch {
    return <div className="site-main"><div className="ep-container"><h1>Forum moderation</h1><div role="alert" className="admin-empty"><h2>Access denied</h2><p>Sign in with an active staff account and the moderation.review capability to view the queue.</p></div></div></div>;
  }

  const capability = await supabase.rpc("has_capability", { p_capability: "moderation.review" });
  if (capability.error) return <div className="site-main"><div className="ep-container"><h1>Forum moderation</h1><div role="alert" className="admin-empty"><h2>Unable to verify access</h2><p>Try again shortly. No report data has been displayed.</p></div></div></div>;
  if (capability.data !== true) return <div className="site-main"><div className="ep-container"><h1>Forum moderation</h1><div role="alert" className="admin-empty"><h2>Access denied</h2><p>Your staff account does not have the moderation.review capability.</p></div></div></div>;

  // The database policy independently limits this result to staff with moderation.review. Select no reporter/member identifiers.
  const { data, error } = await supabase.from("forum_reports").select(`id, reason, note, created_at, post:post_id(id, body, state, thread:thread_id(title))`).eq("state", "open").order("created_at", { ascending: true }).limit(200);
  if (error) return <div className="site-main"><div className="ep-container"><h1>Forum moderation</h1><div role="alert" className="admin-empty"><h2>Error loading reports</h2><p>The moderation queue could not be loaded. Please retry; no action was taken.</p></div></div></div>;
  const reports = (data ?? []) as unknown as Report[];
  const { result } = await searchParams;
  return <div className="site-main"><div className="ep-container">
    <header className="page-header"><div><h1 className="page-header__title">Forum moderation</h1><p className="page-header__lede">Open member reports, restricted to authorized staff. Reporter identities are not shown.</p></div></header>
    {result === "failed" ? <p role="alert" className="admin-empty">Resolution failed. The report remains unchanged; check its status and try again.</p> : result === "saved" ? <p role="status">Report resolution recorded.</p> : null}
    {reports.length === 0 ? <section className="admin-empty" aria-live="polite"><h2 className="admin-empty__title">No open reports</h2><p className="admin-empty__text">The first-five Forum queue is clear.</p></section> : <div className="stat-grid" aria-label="Open forum reports">{reports.map((report) => <article key={report.id} className="stat-card" aria-labelledby={`report-${report.id}`}>
      <h2 id={`report-${report.id}`} className="stat-card__label">Reported post · {report.reason}</h2>
      <p><strong>Thread:</strong> {report.post?.thread?.title ?? "Unavailable thread"}</p>
      <blockquote>{report.post?.body ?? "Post content is unavailable."}</blockquote>
      {report.note ? <p><strong>Reporter note:</strong> {report.note}</p> : null}
      <p><strong>Reported:</strong> <time dateTime={report.created_at}>{new Date(report.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</time></p>
      <p><strong>Post state:</strong> {report.post?.state ?? "unknown"}</p>
      <form action={resolveForumReport} className="moderation-resolution">
        <input type="hidden" name="reportId" value={report.id} />
        <label htmlFor={`action-${report.id}`}>Resolution</label>
        <select id={`action-${report.id}`} name="action" defaultValue="dismiss"><option value="dismiss">Dismiss report</option><option value="hide">Hide post</option><option value="restore">Restore post</option></select>
        <label htmlFor={`reason-${report.id}`}>Staff reason (required, at least 5 characters)</label>
        <textarea id={`reason-${report.id}`} name="resolutionReason" required minLength={5} maxLength={1000} rows={3} />
        <button type="submit" className="ep-button ep-button--primary">Record resolution</button>
      </form>
    </article>)}</div>}
  </div></div>;
}
