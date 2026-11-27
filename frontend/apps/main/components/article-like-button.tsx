"use client";

import { useState, useTransition } from "react";
import { toggleArticleLike, type LikeState } from "../app/news/engagement-actions";

/** Like a story with or without an account; counted once per reader (member id or browser). */
export default function ArticleLikeButton({ articleId, initialLiked, initialCount, className = "", activeClassName = "" }: { articleId: string; initialLiked: boolean; initialCount: number | null; className?: string; activeClassName?: string }) {
  const [state, setState] = useState<LikeState>({ liked: initialLiked, count: initialCount ?? 0 });
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  return <button
    type="button"
    className={`${className}${state.liked ? ` ${activeClassName}` : ""}`}
    aria-pressed={state.liked}
    aria-label={state.liked ? `Unlike this story, ${state.count} likes` : `Like this story, ${state.count} likes`}
    disabled={pending}
    title={failed ? "Your like could not be saved. Try again in a moment." : undefined}
    onClick={() => startTransition(async () => {
      const optimistic = { liked: !state.liked, count: Math.max(0, state.count + (state.liked ? -1 : 1)) };
      const previous = state;
      setState(optimistic);
      const next = await toggleArticleLike(articleId);
      if (next) { setState(next); setFailed(false); } else { setState(previous); setFailed(true); }
    })}
  >
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill={state.liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z" /></svg>
    <span>{state.count > 0 ? state.count.toLocaleString("en-NG") : "Like"}</span>
  </button>;
}
