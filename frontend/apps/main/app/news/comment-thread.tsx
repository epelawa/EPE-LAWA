import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { moderateArticleComment, postArticleComment, reportArticleComment, resolveArticleCommentReport } from "./comment-actions";

type Props = { articleId: string; slug: string; notice?: string };
type ReportRow = { id: string; comment_id: string; reason: string; note: string | null; created_at: string };
type CommentRow = { id: string; parent_id: string | null; body: string; state: "visible" | "deleted" | "hidden"; created_at: string };
const notices: Record<string, string> = {
  submitted: "Your comment is visible to readers. Thank you for contributing.",
  reported: "Your report was sent privately to the moderation team.",
  "verify-email": "Verify your email address before posting or reporting.",
  invalid: "Check that your comment is between 1 and 4,000 characters.",
  "invalid-report": "Choose a valid report reason and check the note length.",
  unavailable: "Your comment could not be posted. Sign in with an active member account and try again.",
  "report-unavailable": "The report could not be submitted. It may already have been reported by your account.",
  "moderation-denied": "This moderation action is unavailable for this account.",
  moderated: "The moderation decision was recorded.",
};
function stamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString("en-NG", { dateStyle: "medium" });
}
export async function CommentThread({ articleId, slug, notice }: Props) {
  const db = await createClient();
  const [{ data: { user } }, { data, error }] = await Promise.all([
    db.auth.getUser(),
    db.from("comments").select("id,parent_id,body,state,created_at").eq("article_id", articleId).order("created_at", { ascending: true }).limit(100),
  ]);
  const { data: canReview } = await db.rpc("has_capability", { p_capability: "moderation.review" });
  const reviewer = canReview === true;
  const { data: reportRows } = reviewer ? await db.from("comment_reports").select("id,comment_id,reason,note,created_at").eq("state", "open").order("created_at", { ascending: true }).limit(50) : { data: [] };
  const comments = (data ?? []) as CommentRow[];
  const top = comments.filter((c) => !c.parent_id);
  const replies = new Map<string, CommentRow[]>();
  for (const comment of comments) if (comment.parent_id) replies.set(comment.parent_id, [...(replies.get(comment.parent_id) ?? []), comment]);
  const reports = (reportRows ?? []) as ReportRow[];
  const noticeText = notice ? notices[notice] : undefined;
  const alertNotice = notice === "invalid" || (notice?.includes("unavailable") ?? false);
  return <section id="comments" className="mt-12 border-t pt-8" aria-labelledby="comments-title">
    <h2 id="comments-title" className="text-2xl font-bold tracking-tight text-[var(--color-navy-900)]">Community comments</h2>
    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Comments are written by signed-in members and shown only while approved under community guidelines. Email addresses are never displayed.</p>
    {noticeText ? <p className="mt-4 rounded-lg border border-[var(--color-brand-coral)] bg-[var(--color-warm-ivory,#fcfaf7)] p-4" role={alertNotice ? "alert" : "status"}>{noticeText}</p> : null}
    {reviewer ? <aside className="mt-5 rounded-xl border-2 border-[var(--color-brand-coral)] bg-[var(--color-warm-ivory,#fcfaf7)] p-4" aria-labelledby="comment-review-title"><h3 id="comment-review-title" className="font-bold">Staff moderation review</h3>{reports.length ? <ul className="mt-3 space-y-3">{reports.map((report) => <li key={report.id} className="rounded-lg border bg-white p-4"><p className="text-sm"><strong>Report reason:</strong> {report.reason}{report.note ? ` — ${report.note}` : ""}</p><form action={resolveArticleCommentReport} className="mt-3 grid max-w-xl gap-3"><input type="hidden" name="slug" value={slug}/><input type="hidden" name="report_id" value={report.id}/><label className="grid gap-1 text-sm font-semibold">Review decision and reason (required)<textarea className="rounded-lg border p-2 font-normal" name="reason" required minLength={5} maxLength={1000} rows={2}/></label><div className="flex flex-wrap gap-2"><button className="min-h-11 rounded-lg bg-[var(--color-brand-red)] px-4 font-semibold text-white" name="action" value="actioned">Record action</button><button className="min-h-11 rounded-lg border px-4 font-semibold" name="action" value="dismissed">Dismiss report</button></div></form></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No open reports are available for review.</p>}</aside> : null}
    {error ? <p className="mt-5 rounded-lg border p-4" role="status">Comments are temporarily unavailable. Please try again later.</p> : top.length === 0 ? <p className="mt-5 rounded-lg border p-4 text-muted-foreground">No comments are available yet.</p> : <ol className="mt-5 space-y-4">{top.map((comment) => <li className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5" key={comment.id}>
      <p className="mb-3 text-xs text-muted-foreground">Community member · <time dateTime={comment.created_at}>{stamp(comment.created_at)}</time></p>
      {comment.state === "deleted" ? <p className="italic text-muted-foreground">This comment was removed by its author.</p> : comment.state === "hidden" ? <p className="italic text-muted-foreground">This comment is hidden while it is reviewed.</p> : <p className="whitespace-pre-wrap leading-relaxed">{comment.body}</p>}
      {user && comment.state === "visible" ? <details className="mt-4 border-t pt-3"><summary className="min-h-11 cursor-pointer py-2 text-sm font-medium underline underline-offset-4">Report this comment</summary><form action={reportArticleComment} className="mt-3 grid max-w-xl gap-3"><input type="hidden" name="slug" value={slug}/><input type="hidden" name="comment_id" value={comment.id}/><label className="grid gap-1 text-sm font-semibold">Reason<select className="min-h-11 rounded-lg border p-2 font-normal" name="reason" required defaultValue=""><option value="" disabled>Choose a reason</option>{[["spam","Spam"],["harassment","Harassment"],["hate","Hate or slurs"],["misinformation","Misinformation"],["privacy","Privacy concern"],["other","Other"]].map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label><label className="grid gap-1 text-sm font-semibold">Additional context (optional)<textarea className="rounded-lg border p-2 font-normal" name="note" maxLength={1000} rows={3}/></label><button className="min-h-11 w-fit rounded-lg border px-4 font-semibold text-[var(--color-brand-red)] focus-visible:outline focus-visible:outline-2" type="submit">Send private report</button></form></details> : null}
      {reviewer && comment.state !== "deleted" ? <form action={moderateArticleComment} className="mt-4 grid max-w-xl gap-3 border-t pt-3"><input type="hidden" name="slug" value={slug}/><input type="hidden" name="comment_id" value={comment.id}/><label className="grid gap-1 text-sm font-semibold">Moderation reason (required)<textarea name="reason" required minLength={5} maxLength={1000} rows={2} className="rounded-lg border p-2 font-normal"/></label><div className="flex gap-2"><button className="min-h-11 rounded-lg border px-4 font-semibold" name="action" value={comment.state === "hidden" ? "restore" : "hide"}>{comment.state === "hidden" ? "Restore comment" : "Hide comment"}</button></div></form> : null}
      {replies.get(comment.id)?.length ? <ol className="mt-4 space-y-3 border-l-2 border-[var(--color-brand-coral)] pl-4">{replies.get(comment.id)!.map((reply)=><li key={reply.id}><p className="mb-2 text-xs text-muted-foreground">Community member · <time dateTime={reply.created_at}>{stamp(reply.created_at)}</time></p>{reply.state === "deleted" ? <p className="italic text-muted-foreground">This reply was removed by its author.</p> : reply.state === "hidden" ? <p className="italic text-muted-foreground">This reply is hidden while it is reviewed.</p> : <p className="whitespace-pre-wrap leading-relaxed">{reply.body}</p>}</li>)}</ol> : null}
      {user && comment.state === "visible" ? <form action={postArticleComment} className="mt-4 grid max-w-2xl gap-3 border-t pt-3"><input type="hidden" name="slug" value={slug}/><input type="hidden" name="article_id" value={articleId}/><input type="hidden" name="parent_id" value={comment.id}/><label className="grid gap-2 text-sm font-semibold" htmlFor={`reply-${comment.id}`}>Reply<textarea id={`reply-${comment.id}`} name="body" required maxLength={4000} rows={3} className="rounded-lg border p-3 font-normal"/></label><button className="min-h-11 w-fit rounded-lg bg-[var(--color-brand-red)] px-4 font-semibold text-white focus-visible:outline focus-visible:outline-2" type="submit">Post reply</button></form> : null}
    </li>)}</ol>}
    {user ? <form action={postArticleComment} className="card mt-6 grid max-w-2xl gap-4 p-5"><h3 className="text-lg font-semibold">Add a comment</h3><input type="hidden" name="slug" value={slug}/><input type="hidden" name="article_id" value={articleId}/><label className="grid gap-2 font-semibold" htmlFor="new-comment">Your comment<textarea id="new-comment" name="body" required maxLength={4000} rows={5} className="rounded-lg border p-3 font-normal" aria-describedby="comment-guidance"/></label><p id="comment-guidance" className="text-sm text-muted-foreground">Up to 4,000 characters. Be respectful; comments are subject to moderation.</p><button className="min-h-11 w-fit rounded-lg bg-[var(--color-brand-red)] px-5 font-semibold text-white focus-visible:outline focus-visible:outline-2" type="submit">Post comment</button></form> : <p className="card mt-6 p-5">Sign in with a verified member account to comment or report. <Link className="font-semibold text-[var(--color-brand-red)] underline underline-offset-4" href={`/login?next=${encodeURIComponent(`/news/${slug}#comments`)}`}>Sign in</Link></p>}
  </section>;
}
