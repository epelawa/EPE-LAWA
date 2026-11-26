"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { replyWithState, type ForumFormState } from "./actions";
import styles from "./forum.module.css";

const initial: ForumFormState = { status: "idle", message: "", attempt: 0 };

/**
 * Messaging-style composer. The draft is controlled so a failed send never
 * clears it; Send shows a pending state and is disabled while posting; Enter
 * sends and Shift+Enter adds a new line on devices with a physical keyboard.
 */
export default function ReplyComposer({ threadId, threadSlug }: { threadId: string; threadSlug: string }) {
  const [state, action, pending] = useActionState(replyWithState, initial);
  const [draft, setDraft] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const empty = draft.trim().length === 0;

  const stateAtSend = useRef<ForumFormState | null>(null);
  const panelRef = useRef<HTMLElement>(null);

  // Publish the docked composer's live height so the floating Support button can sit above Send on phones.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || typeof ResizeObserver === "undefined") return;
    const root = document.documentElement;
    const observer = new ResizeObserver(([entry]) => root.style.setProperty("--forum-composer-h", `${Math.ceil(entry.borderBoxSize?.[0]?.blockSize ?? panel.offsetHeight)}px`));
    observer.observe(panel);
    return () => { observer.disconnect(); root.style.removeProperty("--forum-composer-h"); };
  }, []);

  useEffect(() => { if (state.status === "error") inputRef.current?.focus(); }, [state]);
  // Failures return a new state object; a confirmed send redirects and returns nothing. So when a
  // send finishes with the state object unchanged, the database accepted the reply and the draft
  // can go. Any failure (even after an earlier one) keeps it, matching the error copy.
  useEffect(() => {
    if (pending) { stateAtSend.current = state; return; }
    if (stateAtSend.current && stateAtSend.current === state) setDraft("");
    stateAtSend.current = null;
  }, [pending, state]);

  return <section ref={panelRef} className={styles.composerPanel} aria-label="Write a reply" data-forum-composer="">
    {state.status === "error" ? <p className={styles.composerError} role="alert">{state.message} Your message is still here.</p> : null}
    <form ref={formRef} action={action} className={styles.composerForm} aria-busy={pending}>
      <input type="hidden" name="thread_id" value={threadId} />
      <input type="hidden" name="thread_slug" value={threadSlug} />
      <label className="sr-only" htmlFor="reply-body">Your reply</label>
      <textarea
        ref={inputRef}
        className={styles.composerInput}
        id="reply-body"
        name="body"
        required
        maxLength={20000}
        rows={3}
        placeholder="Write a message…"
        value={draft}
        readOnly={pending}
        aria-describedby="reply-hint"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
          event.preventDefault();
          if (!empty && !pending) formRef.current?.requestSubmit();
        }}
      />
      <button className={styles.composerSend} type="submit" disabled={pending || empty} aria-label={pending ? "Sending reply" : "Send reply"}>
        {pending ? <span className={styles.composerSpinner} aria-hidden="true" /> : null}
        <span>{pending ? "Sending…" : "Send"}</span>
      </button>
    </form>
    <p id="reply-hint" className={styles.composerHint}>{pending ? <span role="status">Posting your reply…</span> : "Replies follow the community guidelines and may be moderated."}</p>
  </section>;
}
