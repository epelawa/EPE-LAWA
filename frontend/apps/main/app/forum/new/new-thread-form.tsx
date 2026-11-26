"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { createThreadWithState, type ForumFormState } from "../actions";

const initial: ForumFormState = { status: "idle", message: "", attempt: 0 };
type Category = { id: string; name: string };

/** Start-a-discussion form: controlled fields so a failed publish keeps everything the member typed. */
export default function NewThreadForm({ categories, selectedId }: { categories: Category[]; selectedId: string }) {
  const [state, action, pending] = useActionState(createThreadWithState, initial);
  const [categoryId, setCategoryId] = useState(selectedId);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (state.status === "error") errorRef.current?.focus(); }, [state]);

  return <form action={action} className="ui-stack-sm" aria-busy={pending}>
    <div className="ui-card ui-stack-sm">
      {state.status === "error" ? <p ref={errorRef} tabIndex={-1} className="ui-notice ui-notice--danger" role="alert">{state.message} Nothing was published and your text is still here.</p> : null}
      <fieldset className="ui-stack-sm" disabled={pending} style={{ border: 0, margin: 0, padding: 0 }}>
        <div className="ui-field"><label className="label" htmlFor="category_id">Category</label><select className="input" id="category_id" name="category_id" required value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="" disabled>Select a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
        <div className="ui-field"><label className="label" htmlFor="title">Title</label><input className="input" id="title" name="title" required minLength={3} maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} /></div>
        <div className="ui-field"><label className="label" htmlFor="body">Your first post</label><textarea className="input" id="body" name="body" required maxLength={20000} rows={7} value={body} onChange={(event) => setBody(event.target.value)} /></div>
        <fieldset className="ui-subtle ui-stack-sm"><legend className="label">Optional poll</legend><p className="ui-muted">Polls are single-choice. Results show totals only, never who voted.</p>
          <div className="ui-field"><label className="label" htmlFor="poll_question">Poll question</label><input className="input" id="poll_question" name="poll_question" minLength={3} maxLength={300} value={pollQuestion} onChange={(event) => setPollQuestion(event.target.value)} /></div>
          {options.map((value, index) => <div className="ui-field" key={index}><label className="label" htmlFor={`poll_option_${index + 1}`}>Option {index + 1}</label><input className="input" id={`poll_option_${index + 1}`} name="poll_option" maxLength={120} value={value} onChange={(event) => setOptions((current) => current.map((item, position) => position === index ? event.target.value : item))} /></div>)}
        </fieldset>
      </fieldset>
      <p className="ui-muted">Posting requires an active member profile. The database applies membership, ban, and category checks.</p>
      <div className="ui-actions">
        <button className="btn-primary" type="submit" disabled={pending} aria-busy={pending}>{pending ? "Publishing…" : "Publish discussion"}</button>
        <Link className="btn-secondary" href="/forum">Cancel</Link>
      </div>
      {pending ? <p className="ui-muted" role="status">Publishing your discussion…</p> : null}
    </div>
  </form>;
}
