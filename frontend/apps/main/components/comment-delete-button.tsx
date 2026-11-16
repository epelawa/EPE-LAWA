"use client";

import { useState } from "react";
import { deleteArticleComment } from "../app/news/comment-actions";
import BrandedDialog from "./branded-dialog";
import { TrashIcon } from "./icons";

/**
 * Author-only comment deletion, confirmed in the branded modal.
 * The server action calls the audited `comment_delete` RPC; the database
 * re-checks authorship, so hiding this button is not the authorization.
 */
export default function CommentDeleteButton({
  slug,
  commentId,
  compact = false,
}: {
  slug: string;
  commentId: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={`comment-delete-trigger${compact ? " comment-delete-trigger--compact" : ""}`}
        onClick={() => setOpen(true)}
        aria-label="Delete your comment"
      >
        <TrashIcon size={15} />
        <span>Delete</span>
      </button>
      <BrandedDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete this comment?"
        description="Your words are removed for everyone. Replies stay in the thread so the conversation still reads, and this cannot be undone."
      >
        <form action={deleteArticleComment} className="ui-dialog__actions">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="comment_id" value={commentId} />
          <button className="btn-secondary" type="button" onClick={() => setOpen(false)}>Keep comment</button>
          <button className="btn-danger" type="submit">Delete comment</button>
        </form>
      </BrandedDialog>
    </>
  );
}
