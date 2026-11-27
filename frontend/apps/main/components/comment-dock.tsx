"use client";

import { useState } from "react";
import { postArticleComment } from "../app/news/comment-actions";
import BrandedDialog from "./branded-dialog";
import { MessageCircleIcon } from "./icons";

/**
 * Floating comment action, modelled on the reference mobile layout: a round
 * cobalt button pinned above the bottom navigation opens a branded bottom-sheet
 * composer instead of a bare inline field.
 */
export default function CommentDock({
  articleId,
  slug,
  count,
  signedIn,
  signInHref,
}: {
  articleId: string;
  slug: string;
  count: number | null;
  signedIn: boolean;
  signInHref: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="comment-dock">
      <button
        type="button"
        className="comment-fab"
        aria-label={count !== null && count > 0 ? `Open comments, ${count} so far` : "Open comments"}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <MessageCircleIcon size={22} />
        {count !== null && count > 0 ? <span className="comment-fab__count" aria-hidden="true">{count > 99 ? "99+" : count}</span> : null}
      </button>
      <BrandedDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Join the conversation"
        description={count === null ? "Comment count is currently unavailable." : count > 0 ? `${count} ${count === 1 ? "comment" : "comments"} on this story so far.` : "Be the first to comment on this story."}
        className="comment-dock__dialog"
      >
        {signedIn ? (
          <form action={postArticleComment} className="comment-dock__form">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="article_id" value={articleId} />
            <label className="sr-only" htmlFor="dock-comment">Write a comment</label>
            <textarea
              id="dock-comment"
              name="body"
              required
              maxLength={4000}
              rows={4}
              className="input"
              placeholder="Write a comment…"
              data-autofocus
            />
            <p className="comment-dock__guidance">Comments follow community guidelines. You can delete your own comment later.</p>
            <div className="ui-dialog__actions">
              <a className="btn-secondary" href="#comments" onClick={() => setOpen(false)}>Read all comments</a>
              <button className="btn-primary" type="submit">Post comment</button>
            </div>
          </form>
        ) : (
          <div className="comment-dock__signed-out">
            <p>No account needed: comment as a guest, or sign in to comment under your member account.</p>
            <div className="ui-dialog__actions">
              <a className="btn-secondary" href="#comments" onClick={() => setOpen(false)}>Read comments</a>
              <a className="btn-secondary" href={signInHref}>Sign in</a>
              <a className="btn-primary" href="#write-comment" onClick={() => setOpen(false)} data-autofocus>Comment as a guest</a>
            </div>
          </div>
        )}
      </BrandedDialog>
    </div>
  );
}
