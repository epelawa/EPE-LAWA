import { createStaffClient } from "../../../../lib/supabase";
import { adminHref } from "../../../../lib/admin-path";
import { editComment, deleteComment } from "./actions";
import ConfirmSubmit from "../../../../components/confirm-submit";
import { EmptyPanel, Notice, PageFrame, PageIntro, Panel, SectionHeading, StatusBadge } from "@epelawa/ui";
import type { ReactNode } from "react";

type CommentRow = {
  id: string;
  body: string;
  state: string;
  created_at: string;
  article: { slug: string } | null;
};

function Frame({ children }: { children: ReactNode }) {
  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="Staff tools · Comments" title="Article comments" description="Edit what members wrote on published stories, or remove a comment completely. Every change is recorded with your staff account and a reason." />
    {children}
  </PageFrame>;
}

function CommentItem({ comment }: { comment: CommentRow }) {
  const deleted = comment.state === "deleted";
  return <li><Panel className="ui-stack-sm">
    <div className="ui-row">
      <p className="ui-meta">Story: {comment.article?.slug ? `/${comment.article.slug}` : "Unknown"} · written {new Date(comment.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</p>
      <StatusBadge tone={comment.state === "visible" ? "success" : comment.state === "hidden" ? "warning" : "neutral"}>{comment.state}</StatusBadge>
    </div>
    {deleted ? <p className="ui-subtle">Removed — the words are gone and replies keep their place in the thread.</p> : <div className="ui-stack-sm">
      <blockquote className="ui-subtle">{comment.body}</blockquote>
      <form action={editComment} className="ui-stack-sm ui-divider">
        <input type="hidden" name="commentId" value={comment.id} />
        <div className="ui-form-grid">
          <label className="ui-field"><span className="label">Edit the comment (overwrites what the member wrote, 1–4000 characters)</span><textarea name="body" required minLength={1} maxLength={4000} rows={3} defaultValue={comment.body} className="input" /></label>
        </div>
        <div className="ui-actions"><ConfirmSubmit message="Replace the member's words with this staff edit? The original text is not kept." confirmLabel="Save edit" className="btn-primary">Save edit</ConfirmSubmit></div>
      </form>
      <form action={deleteComment} className="ui-stack-sm ui-divider">
        <input type="hidden" name="commentId" value={comment.id} />
        <div className="ui-form-grid">
          <label className="ui-field"><span className="label">Removal reason (at least 5 characters, kept in the audit record)</span><textarea name="reason" required minLength={5} maxLength={1000} rows={2} className="input" /></label>
        </div>
        <div className="ui-actions"><ConfirmSubmit message="Remove this comment for everyone? Replies stay readable and the removal is recorded." confirmLabel="Remove comment" className="btn-danger">Remove comment</ConfirmSubmit></div>
      </form>
    </div>}
  </Panel></li>;
}

export default async function CommentsAdminPage({ searchParams }: { searchParams: Promise<{ result?: string; article?: string }> }) {
  const supabase = await createStaffClient();

  const capability = await supabase.rpc("has_capability", { p_capability: "moderation.review" });
  if (capability.error) return <Frame><Notice tone="danger" role="alert"><SectionHeading title="Unable to verify access" description="Try again shortly. No comment content has been displayed." /></Notice></Frame>;
  if (capability.data !== true) return <Frame><Notice tone="danger" role="alert"><SectionHeading title="Access denied" description="Your staff account does not have the moderation.review capability." /></Notice></Frame>;

  const { result, article: articleSlug } = await searchParams;
  let query = supabase.from("comments").select("id,body,state,created_at,article:articles(slug)").order("created_at", { ascending: false }).limit(100);
  if (articleSlug && /^[a-z0-9-]{1,120}$/.test(articleSlug)) {
    query = supabase.from("comments").select("id,body,state,created_at,article:articles!inner(slug)").eq("article.slug", articleSlug).order("created_at", { ascending: false }).limit(100);
  }
  const { data, error } = await query;
  const comments = (data ?? []) as unknown as CommentRow[];

  return <Frame>
    {result === "edited" ? <Notice tone="success" role="status">The comment was updated on the story.</Notice> : null}
    {result === "removed" ? <Notice tone="success" role="status">The comment was removed and the reason was recorded.</Notice> : null}
    {result === "failed" ? <Notice tone="danger" role="alert">The change failed — check the field limits and your moderation.review access. Nothing was changed.</Notice> : null}
    {articleSlug ? <Notice tone="neutral">Showing comments on one story — <a href={adminHref("/moderation/comments")}>show every story</a>.</Notice> : null}
    {error ? <Notice tone="danger" role="alert"><SectionHeading title="Comments unavailable" description="The comment list could not be loaded. Retry in a moment; nothing was changed." /></Notice> : null}
    {!error && !comments.length ? <EmptyPanel title="No comments yet" description="Member comments on published stories appear here, newest first." /> : null}
    {!error && comments.length ? <Panel>
      <SectionHeading eyebrow="Recent activity" title="Latest comments" description={`${comments.length} ${comments.length === 1 ? "comment" : "comments"} · newest first`} />
      <ul className="ui-list ui-stack-sm">{comments.map((comment) => <CommentItem key={comment.id} comment={comment} />)}</ul>
    </Panel> : null}
  </Frame>;
}
