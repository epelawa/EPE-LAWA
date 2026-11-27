"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import HumanCheck from "./human-check";
import { postGuestComment, type GuestCommentState } from "../app/news/engagement-actions";
import styles from "../app/news/news.module.css";

const initialState: GuestCommentState = { status: "idle", message: "" };

/**
 * Comment or reply without an account. Collapsed until opened, so the human
 * check (proof-of-work or Turnstile) only runs for readers who actually write.
 */
export default function GuestCommentForm({ articleId, slug, parentId, signInHref, label = "Write a comment", id = "guest-comment" }: { articleId: string; slug: string; parentId?: string; signInHref: string; label?: string; id?: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(postGuestComment, initialState);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "success") form.current?.reset();
  }, [state]);
  // The floating comment button links to #write-comment: open the main composer when it does.
  useEffect(() => {
    if (parentId) return;
    const sync = () => { if (window.location.hash === "#write-comment") setOpen(true); };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [parentId]);

  if (!open) {
    return <div className={parentId ? styles.guestReplyToggleRow : styles.guestComposeRow}>
      <button type="button" className={parentId ? styles.guestReplyToggle : styles.guestComposeToggle} aria-expanded="false" aria-controls={id} onClick={() => setOpen(true)}>
        {label}
      </button>
      {state.status === "success" ? <p role="status" className={styles.guestNotice}>{state.message}</p> : null}
    </div>;
  }

  return <form id={id} ref={form} action={action} className={styles.guestComposer} aria-label={parentId ? "Reply as a guest" : "Comment as a guest"}>
    <input type="hidden" name="slug" value={slug} />
    <input type="hidden" name="article_id" value={articleId} />
    {parentId ? <input type="hidden" name="parent_id" value={parentId} /> : null}
    <label className="ui-field">
      <span className="label">{parentId ? "Your reply" : "Your comment"}</span>
      <textarea className="input" name="body" required minLength={2} maxLength={2000} rows={parentId ? 3 : 4} placeholder={parentId ? "Write a reply…" : "Share your view on this story…"} autoFocus />
    </label>
    <label className="ui-field">
      <span className="label">Name to show (optional)</span>
      <input className="input" name="guest_name" minLength={2} maxLength={60} autoComplete="nickname" placeholder="Shown as “Guest reader” if empty" />
    </label>
    <HumanCheck compact resetOn={state} />
    {state.status === "error" ? <p role="alert" className="ui-form-error">{state.message}</p> : null}
    {state.status === "success" ? <p role="status" className={styles.guestNotice}>{state.message}</p> : null}
    <p className={styles.commentGuidance}>No account needed. Keep it respectful: no links, insults or personal details. Moderators may hide comments that break the <a className="ui-text-link" href="/guidelines">community guidelines</a>. Prefer an account? <a className="ui-text-link" href={signInHref}>Sign in</a>.</p>
    <div className="ui-actions">
      <button className="btn-secondary" type="button" onClick={() => setOpen(false)}>Cancel</button>
      <button className="btn-primary" type="submit" disabled={pending}>{pending ? "Posting…" : parentId ? "Post reply" : "Post comment"}</button>
    </div>
  </form>;
}
