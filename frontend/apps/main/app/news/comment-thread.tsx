import { SubmitButton } from "@epelawa/ui";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { formatLagosDateTime } from "../../lib/dates";
import { moderateArticleComment, postArticleComment, reportArticleComment, resolveArticleCommentReport } from "./comment-actions";
import { Notice, Panel } from "../../components/design-system";
import CommentDeleteButton from "../../components/comment-delete-button";
import { MessageCircleIcon } from "../../components/icons";
import CommentVoteButton from "./comment-vote-button";
import { deleteGuestComment } from "./engagement-actions";
import GuestCommentForm from "../../components/guest-comment-form";
import { formAdminClient } from "../../lib/form-server";
import { readGuestKey } from "../../lib/guest-identity";
import styles from "./news.module.css";

type Props = { articleId: string; slug: string; notice?: string };
type ReportRow = { id: string; comment_id: string; reason: string; note: string | null; created_at: string };
type CommentRow = { id: string; parent_id: string | null; body: string; state: "visible" | "deleted" | "hidden"; created_at: string; guest_name: string | null; author_id?: string | null };

const notices: Record<string, string> = {
  submitted: "Your comment is visible to readers. Thank you for contributing.",
  reported: "Your report was sent privately to the moderation team.",
  deleted: "Your comment was deleted. Replies stay in the thread, but your words are gone.",
  "verify-email": "Verify your email address before posting or reporting.",
  invalid: "Check that your comment is between 1 and 4,000 characters.",
  "invalid-report": "Choose a valid report reason and check the note length.",
  "invalid-delete": "That comment could not be identified. Refresh the page and try again.",
  unavailable: "Your comment could not be posted. Sign in with an active member account and try again.",
  "report-unavailable": "The report could not be submitted. It may already have been reported by your account.",
  "delete-denied": "Only the person who wrote a comment can delete it, from the account or browser that posted it.",
  "delete-unavailable": "That comment could not be deleted. Refresh the page and try again.",
  "moderation-denied": "This moderation action is unavailable for this account.",
  moderated: "The moderation decision was recorded.",
};

function stamp(value: string) {
  return formatLagosDateTime(value) ?? "Date unavailable";
}

/** Members stay anonymous ("Community member"); guests may choose a display name. */
function who(comment: CommentRow, guestIds: Set<string>) {
  if (comment.guest_name) return `${comment.guest_name} · Guest`;
  return guestIds.has(comment.id) ? "Guest reader" : "Community member";
}

const field = "ui-field";
const textarea = "input min-h-28 w-full resize-y";

function CommentText({ comment, noun = "comment" }: { comment: CommentRow; noun?: string }) {
  return comment.state === "deleted"
    ? <p className="ui-muted italic">This {noun} was removed by its author.</p>
    : comment.state === "hidden"
      ? <p className="ui-muted italic">This {noun} is hidden while it is reviewed.</p>
      : <p className="whitespace-pre-wrap leading-relaxed">{comment.body}</p>;
}

export async function CommentThread({ articleId, slug, notice }: Props) {
  const db = await createClient();
  const [{ data: { user } }, { data, error }, { data: canReview }] = await Promise.all([
    db.auth.getUser(),
    db.from("comments").select("id,parent_id,body,state,created_at,guest_name").eq("article_id", articleId).order("created_at", { ascending: true }).limit(100),
    db.rpc("has_capability", { p_capability: "moderation.review" }),
  ]);
  const reviewer = canReview === true;
  const { data: reportRows } = reviewer
    ? await db.from("comment_reports").select("id,comment_id,reason,note,created_at").eq("state", "open").order("created_at", { ascending: true }).limit(50)
    : { data: [] };

  // Own-comment discovery is a separate, id-only read so the public comment
  // query keeps returning anonymous member identity only.
  const ownIds = new Set<string>();
  if (user) {
    const { data: ownRows } = await db.from("comments").select("id").eq("author_id", user.id).eq("article_id", articleId).limit(200);
    for (const row of ownRows ?? []) ownIds.add(row.id);
  }

  const comments = (data ?? []) as CommentRow[];
  // Guest authorship: which comments came from guests at all (labelling) and which from this browser (delete).
  // Both are service-role reads of ids only; the guest key itself never leaves the server.
  const guestIds = new Set<string>();
  const ownGuestIds = new Set<string>();
  const guestKey = user ? null : await readGuestKey();
  if (comments.length > 0) {
    try {
      const admin = formAdminClient();
      const { data: guestRows } = await admin.from("comments").select("id,guest_key").eq("article_id", articleId).is("author_id", null).not("guest_key", "is", null).limit(200);
      for (const row of guestRows ?? []) {
        guestIds.add(String(row.id));
        if (guestKey && row.guest_key === guestKey) ownGuestIds.add(String(row.id));
      }
    } catch { /* Labels fall back to "Community member"; deleting stays possible from the account that posted. */ }
  }
  const top = comments.filter((comment) => !comment.parent_id);
  const replies = new Map<string, CommentRow[]>();
  for (const comment of comments) if (comment.parent_id) replies.set(comment.parent_id, [...(replies.get(comment.parent_id) ?? []), comment]);
  const reports = (reportRows ?? []) as ReportRow[];
  const noticeText = notice ? notices[notice] : undefined;
  const alertNotice = notice === "invalid" || (notice?.includes("unavailable") ?? false) || (notice?.includes("denied") ?? false);
  const visibleCount = comments.filter((comment) => comment.state === "visible").length;

  const voteTargetIds = comments.filter((comment) => comment.state === "visible").map((comment) => comment.id);
  const voteCounts = new Map<string, number>();
  const ownVotes = new Set<string>();
  if (voteTargetIds.length > 0) {
    // Totals include member and guest "helpful" marks; the reader's own marks come from their account or browser.
    const [{ data: totals }, own] = await Promise.all([
      db.rpc("comment_vote_totals", { p_comment_ids: voteTargetIds }),
      user
        ? db.from("comment_votes").select("comment_id").in("comment_id", voteTargetIds).eq("user_id", user.id).limit(500)
        : guestKey
          ? (async () => { try { return await formAdminClient().rpc("comment_guest_voted", { p_comment_ids: voteTargetIds, p_voter_key: guestKey }); } catch { return { data: [] }; } })()
          : Promise.resolve({ data: [] }),
    ]);
    for (const row of (totals ?? []) as { comment_id: string; total: number | string }[]) voteCounts.set(row.comment_id, Number(row.total) || 0);
    for (const row of (own.data ?? []) as unknown[]) ownVotes.add(typeof row === "string" ? row : String((row as { comment_id?: string; comment_guest_voted?: string }).comment_id ?? (row as { comment_guest_voted?: string }).comment_guest_voted ?? ""));
  }
  const sortedTop = [...top].sort((a, b) => {
    if (a.state !== "visible" || b.state !== "visible") return 0;
    return (voteCounts.get(b.id) ?? 0) - (voteCounts.get(a.id) ?? 0);
  });
  const signInHref = `/login?next=${encodeURIComponent(`/news/${slug}#comments`)}`;

  return <section id="comments" className={`ui-stack ${styles.commentSection}`} aria-label="Comments">
    <header className={styles.commentHeading}>
      <div>
        <p className="ui-eyebrow">Conversation</p>
        <h2>{!error && comments.length < 100 && visibleCount > 0 ? `Comments (${visibleCount})` : "Comments"}</h2>
      </div>
      {!error && comments.length < 100 ? <span className={styles.commentCountPill} aria-hidden="true"><MessageCircleIcon size={15} /> {visibleCount}</span> : null}
    </header>
    {noticeText ? <Notice tone={alertNotice ? "warning" : "success"} role={alertNotice ? "alert" : "status"}>{noticeText}</Notice> : null}
    {reviewer ? <Panel className="ui-subtle" aria-labelledby="comment-review-title">
      <div className="ui-stack-sm">
        <div><p className="ui-eyebrow">Staff tools</p><h3 id="comment-review-title" className="text-lg font-semibold">Staff moderation review</h3></div>
        {reports.length ? <ul className="ui-list ui-stack-sm">{reports.map(report => <li key={report.id} className="ui-card">
          <p><strong>Report reason:</strong> {report.reason}{report.note ? ` — ${report.note}` : ""}</p>
          <form action={resolveArticleCommentReport} className="ui-stack-sm mt-4">
            <input type="hidden" name="slug" value={slug} /><input type="hidden" name="report_id" value={report.id} />
            <label className={field}>Review decision and reason (required)<textarea className={textarea} name="reason" required minLength={5} maxLength={1000} rows={2} /></label>
            <div className="ui-actions"><button className="btn-primary" name="action" value="actioned">Record action</button><button className="btn-secondary" name="action" value="dismissed">Dismiss report</button></div>
          </form>
        </li>)}</ul> : <p className="ui-muted">No open reports are available for review.</p>}
      </div>
    </Panel> : null}
    {error ? <Notice role="status">Comments are temporarily unavailable. Please try again later.</Notice> : null}
    {!error && sortedTop.length > 0 ? <ol className="ui-list ui-stack-sm">{sortedTop.map(comment => <li className="ui-card" key={comment.id}>
      <p className="ui-meta mb-3">{who(comment, guestIds)} · <time dateTime={comment.created_at}>{stamp(comment.created_at)}</time></p>
      <CommentText comment={comment} />
      <div className={styles.commentActions}>
        {comment.state === "visible" ? <CommentVoteButton
          commentId={comment.id}
          initialCount={voteCounts.get(comment.id) ?? 0}
          initialVoted={ownVotes.has(comment.id)}
        /> : null}
        {user && comment.state === "visible" && ownIds.has(comment.id) ? <CommentDeleteButton slug={slug} commentId={comment.id} /> : null}
        {!user && comment.state === "visible" && ownGuestIds.has(comment.id) ? <GuestDelete slug={slug} commentId={comment.id} /> : null}
        {user && comment.state === "visible" ? <details className="ui-divider mt-4 pt-3">
          <summary className="min-h-11 cursor-pointer py-2 font-medium">Report this comment</summary>
          <form action={reportArticleComment} className="ui-stack-sm mt-3 max-w-xl">
            <input type="hidden" name="slug" value={slug} /><input type="hidden" name="comment_id" value={comment.id} />
            <label className={field}>Reason<select className="input" name="reason" required defaultValue=""><option value="" disabled>Choose a reason</option>{[["spam","Spam"],["harassment","Harassment"],["hate","Hate or slurs"],["misinformation","Misinformation"],["privacy","Privacy concern"],["other","Other"]].map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label className={field}>Additional context (optional)<textarea className={textarea} name="note" maxLength={1000} rows={3} /></label>
            <SubmitButton pendingLabel="Sending…" className="btn-secondary w-fit" useLegacyClasses>Send private report</SubmitButton>
          </form>
        </details> : null}
      </div>
      {reviewer && comment.state !== "deleted" ? <form action={moderateArticleComment} className="ui-divider ui-stack-sm mt-4 pt-3 max-w-xl">
        <input type="hidden" name="slug" value={slug} /><input type="hidden" name="comment_id" value={comment.id} />
        <label className={field}>Moderation reason (required)<textarea name="reason" required minLength={5} maxLength={1000} rows={2} className={textarea} /></label>
        <div className="ui-actions"><button className="btn-secondary" name="action" value={comment.state === "hidden" ? "restore" : "hide"}>{comment.state === "hidden" ? "Restore comment" : "Hide comment"}</button></div>
      </form> : null}
      {replies.get(comment.id)?.length ? <ol className="ui-list ui-stack-sm ui-subtle mt-4 rounded-xl border p-4">{replies.get(comment.id)!.map(reply => <li key={reply.id} className="ui-item">
        <p className="ui-meta mb-2">{who(reply, guestIds)} · <time dateTime={reply.created_at}>{stamp(reply.created_at)}</time></p>
        <CommentText comment={reply} noun="reply" />
        {reply.state === "visible" ? <div className={styles.commentActions}>
          {reply.state === "visible" ? <CommentVoteButton
            commentId={reply.id}
            initialCount={voteCounts.get(reply.id) ?? 0}
            initialVoted={ownVotes.has(reply.id)}
          /> : null}
          {user && reply.state === "visible" && ownIds.has(reply.id) ? <CommentDeleteButton slug={slug} commentId={reply.id} compact /> : null}
          {!user && reply.state === "visible" && ownGuestIds.has(reply.id) ? <GuestDelete slug={slug} commentId={reply.id} /> : null}
        </div> : null}
      </li>)}</ol> : null}
      {user && comment.state === "visible" ? <form action={postArticleComment} className="ui-divider ui-stack-sm mt-4 max-w-2xl pt-3">
        <input type="hidden" name="slug" value={slug} /><input type="hidden" name="article_id" value={articleId} /><input type="hidden" name="parent_id" value={comment.id} />
        <label className={field} htmlFor={`reply-${comment.id}`}>Reply<textarea id={`reply-${comment.id}`} name="body" required maxLength={4000} rows={3} className={textarea} /></label>
        <SubmitButton pendingLabel="Posting…" className="btn-primary w-fit" useLegacyClasses>Post reply</SubmitButton>
      </form> : null}
      {!user && comment.state === "visible" ? <GuestCommentForm articleId={articleId} slug={slug} parentId={comment.id} signInHref={signInHref} label="Reply" id={`guest-reply-${comment.id}`} /> : null}
    </li>)}</ol> : null}
    {user ? <details className={styles.commentComposerPanel}><summary className={styles.commentComposeToggle}>Write a comment</summary>
      <form action={postArticleComment} className={styles.commentComposer}>
        <input type="hidden" name="slug" value={slug} /><input type="hidden" name="article_id" value={articleId} />
        <label className="sr-only" htmlFor="new-comment">Write a comment</label>
        <textarea id="new-comment" name="body" required maxLength={4000} rows={1} className={styles.commentInput} placeholder="Write a comment…" aria-describedby="comment-guidance" />
        <SubmitButton className={styles.commentSubmit} aria-label="Post comment" title="Post comment" pendingLabel="…"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4 20-7Z" /><path d="M22 2 11 13" /></svg></SubmitButton>
      </form>
      <p id="comment-guidance" className={styles.commentGuidance}>Comments follow community guidelines. You can delete your own comment at any time.</p>
    </details> : <div className={styles.guestComposerWrap} id="write-comment">
      <GuestCommentForm articleId={articleId} slug={slug} signInHref={signInHref} label="Write a comment — no account needed" />
      <p className={styles.commentSignInNote}>Members can also <Link className={styles.commentSignInLink} aria-label="Sign in to comment" href={signInHref}>sign in to comment</Link> under their account.</p>
    </div>}
  </section>;
}

function GuestDelete({ slug, commentId }: { slug: string; commentId: string }) {
  return <form action={deleteGuestComment} className={styles.guestDeleteForm}>
    <input type="hidden" name="slug" value={slug} /><input type="hidden" name="comment_id" value={commentId} />
    <SubmitButton className={styles.commentVoteButton} pendingLabel="Deleting…">Delete my comment</SubmitButton>
  </form>;
}
