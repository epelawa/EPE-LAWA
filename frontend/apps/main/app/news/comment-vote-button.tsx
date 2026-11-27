"use client";

import { useState, useTransition } from "react";
import { toggleCommentLike } from "./engagement-actions";
import styles from "./news.module.css";

/** "Helpful" on a comment. Members vote as themselves; signed-out readers as their browser. */
export default function CommentVoteButton({
  commentId,
  initialCount,
  initialVoted,
}: {
  commentId: string;
  initialCount: number;
  initialVoted: boolean;
}) {
  const [state, setState] = useState({ voted: initialVoted, count: initialCount });
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className={`${styles.commentVoteButton}${state.voted ? ` ${styles.commentVoteButtonActive}` : ""}`}
      aria-pressed={state.voted}
      aria-label={state.voted ? `Remove your helpful mark, ${state.count} readers agree` : `Mark this comment helpful, ${state.count} readers agree`}
      disabled={pending}
      onClick={() => startTransition(async () => {
        const next = await toggleCommentLike(commentId);
        if (next) setState(next);
      })}
    >
      Helpful · {state.count}
    </button>
  );
}
