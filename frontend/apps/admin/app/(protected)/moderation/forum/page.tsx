import { createStaffClient } from "../../../../lib/supabase";
import { resolveForumReport, deleteForumThread, deleteForumPost, restoreForumPost } from "./actions";
import ConfirmSubmit from "../../../../components/confirm-submit";
import {  EmptyPanel, Notice, PageFrame, PageIntro, Panel, SectionHeading, StatusBadge, SubmitButton } from "@epelawa/ui";
import type { ReactNode } from "react";

type Report = {
  id: string; reason: string; note: string | null; created_at: string;
  post: { id: string; body: string; state: string; thread: { title: string } | null } | null;
};

type ThreadRow = {
  id: string; title: string; state: string; is_pinned: boolean; post_count: number; created_at: string;
  category: { name: string } | null;
};

type PostRow = {
  id: string; body: string; state: string; created_at: string;
  thread: { title: string } | null;
};

function QueuePage({ children }: { children: ReactNode }) {
  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="Staff tools · Forum" title="Forum moderation" description="Review open member reports, and keep the conversation clean by removing messages or whole chats. Moderator actions are recorded with a reason." />
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
  const [threadsResult, postsResult] = await Promise.all([
    supabase.from("forum_threads").select("id,title,state,is_pinned,post_count,created_at,category:forum_categories(name)").order("created_at", { ascending: false }).limit(30),
    supabase.from("forum_posts").select("id,body,state,created_at,thread:thread_id(title)").order("created_at", { ascending: false }).limit(40),
  ]);
  const threads = (threadsResult.data ?? []) as unknown as ThreadRow[];
  const posts = (postsResult.data ?? []) as unknown as PostRow[];
  const { result } = await searchParams;
  return <QueuePage>
    {result === "failed" ? <Notice tone="danger" role="alert">Resolution failed. The report remains unchanged; check its status and try again.</Notice> : result === "saved" ? <Notice tone="success" role="status">Report resolution recorded.</Notice> : null}
    {result === "removed" ? <Notice tone="success" role="status">The content was removed and the reason was recorded.</Notice> : null}
    {result === "restored" ? <Notice tone="success" role="status">The message was restored to the conversation.</Notice> : null}
    {result === "delete-failed" ? <Notice tone="danger" role="alert">The removal failed — write a reason of at least 5 characters and confirm your moderation.review access. Nothing was changed.</Notice> : null}
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
            <div className="ui-actions"><SubmitButton pendingLabel="Recording…" className="btn-primary" useLegacyClasses>Record resolution</SubmitButton></div>
          </form>
        </article>)}
      </div>}
    </Panel>

    <Panel>
      <SectionHeading eyebrow="Chats" title="Recent conversations" description="The newest community chats. Removing a chat removes all of its messages; both actions need a recorded reason." />
      {!threads.length ? <EmptyPanel title="No conversations yet" description="Community chats appear here as soon as members start them." /> : <ul className="ui-list ui-stack-sm">{threads.map((thread) => <li key={thread.id}><Panel className="ui-stack-sm">
        <div className="ui-row">
          <div className="ui-stack-sm">
            <h3 className="ui-item-title">{thread.title}{thread.is_pinned ? " · pinned" : ""}</h3>
            <p className="ui-meta">{thread.category?.name ?? "Uncategorised"} · {thread.post_count} {thread.post_count === 1 ? "message" : "messages"} · started {new Date(thread.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</p>
          </div>
          <StatusBadge tone={thread.state === "open" ? "success" : thread.state === "locked" ? "warning" : "neutral"}>{thread.state}</StatusBadge>
        </div>
        <form action={deleteForumThread} className="ui-stack-sm ui-divider">
          <input type="hidden" name="threadId" value={thread.id} />
          <div className="ui-form-grid">
            <label className="ui-field"><span className="label">Removal reason (at least 5 characters, kept in the audit record)</span><textarea name="reason" required minLength={5} maxLength={1000} rows={2} className="input" /></label>
          </div>
          <div className="ui-actions"><ConfirmSubmit message={`Remove the chat “${thread.title}” with all of its messages? Members lose access to it immediately.`} confirmLabel="Remove chat" className="btn-danger">Remove chat</ConfirmSubmit></div>
        </form>
      </Panel></li>)}</ul>}
    </Panel>

    <Panel>
      <SectionHeading eyebrow="Messages" title="Recent messages" description="The newest messages across every chat. Remove one message, or restore one the desk removed earlier." />
      {!posts.length ? <EmptyPanel title="No messages yet" description="Member messages appear here as soon as they are posted." /> : <ul className="ui-list ui-stack-sm">{posts.map((post) => <li key={post.id}><Panel className="ui-stack-sm">
        <div className="ui-row">
          <p className="ui-meta">In: {post.thread?.title ?? "Unknown chat"} · posted {new Date(post.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</p>
          <StatusBadge tone={post.state === "visible" ? "success" : post.state === "hidden" ? "warning" : "neutral"}>{post.state}</StatusBadge>
        </div>
        {post.state === "deleted" ? <p className="ui-subtle">Message removed by staff — body no longer stored on the thread.</p> : <blockquote className="ui-subtle">{post.body || "(empty)"}</blockquote>}
        {post.state !== "deleted" ? <form action={deleteForumPost} className="ui-stack-sm ui-divider">
          <input type="hidden" name="postId" value={post.id} />
          <div className="ui-form-grid">
            <label className="ui-field"><span className="label">Removal reason (at least 5 characters, kept in the audit record)</span><textarea name="reason" required minLength={5} maxLength={1000} rows={2} className="input" /></label>
          </div>
          <div className="ui-actions"><ConfirmSubmit message="Remove this message? Replies stay readable and the removal is recorded." confirmLabel="Remove message" className="btn-danger">Remove message</ConfirmSubmit></div>
        </form> : <form action={restoreForumPost} className="ui-stack-sm ui-divider">
          <input type="hidden" name="postId" value={post.id} />
          <div className="ui-form-grid">
            <label className="ui-field"><span className="label">Restore reason (at least 5 characters)</span><textarea name="reason" required minLength={5} maxLength={1000} rows={2} className="input" /></label>
          </div>
          <div className="ui-actions"><ConfirmSubmit message="Restore this message to the conversation?" confirmLabel="Restore message" className="btn-secondary">Restore message</ConfirmSubmit></div>
        </form>}
      </Panel></li>)}</ul>}
    </Panel>
  </QueuePage>;
}
