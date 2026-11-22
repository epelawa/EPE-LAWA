"use client";

import { useState, useTransition } from "react";
import { commentVoteToggle, type CommentVoteState } from "./comment-vote-actions";
import styles from "./news.module.css";

export default function CommentVoteButton({
  commentId,
  initialCount,
  initialVoted,
  signedIn,
  signInHref,
}: {
  commentId: string;
  initialCount: number;
  initialVoted: boolean;
  signedIn: boolean;
  signInHref: string;
}) {
  const [state, setState] = useState<CommentVoteState>({ voted: initialVoted, count: initialCount });
  const [pending, startTransition] = useTransition();
  if (!signedIn) {
    return <a className={styles.commentVoteButton} href={signInHref} aria-label={`Sign in to mark this comment helpful, ${initialCount} members have`}>Helpful · {initialCount}</a>;
  }
  return (
    <button
      type="button"
      className={`${styles.commentVoteButton}${state.voted ? ` ${styles.commentVoteButtonActive}` : ""}`}
      aria-pressed={state.voted}
      aria-label={state.voted ? `Remove your helpful mark, ${state.count} members agree` : `Mark this comment helpful, ${state.count} members agree`}
      disabled={pending}
      onClick={() => startTransition(async () => {
        const next = await commentVoteToggle(commentId);
        if (next) setState(next);
      })}
    >
      Helpful · {state.count}
    </button>
  );
}
