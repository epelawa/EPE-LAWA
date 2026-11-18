"use client";
import { useState } from "react";
import { addInlineAuthor } from "../lib/inline-author-actions";

type Author = { id: string; display_name?: string };
export default function AuthorPicker({ authors, initialId = "", onChange }: { authors: Author[]; initialId?: string; onChange?: (id: string, name: string) => void }) {
  const [options, setOptions] = useState(authors);
  const [selected, setSelected] = useState(initialId);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function add() {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const result = await addInlineAuthor(name);
      if ("error" in result) { setMessage(result.error); return; }
      setOptions(items => [...items, { id: result.id, display_name: result.name }]);
      setSelected(result.id); setName(""); onChange?.(result.id, result.name);
      setMessage("Author added and selected. This byline is now available for other stories.");
    } catch { setMessage("Could not add this author. Please try again."); }
    finally { setBusy(false); }
  }
  return <div className="ui-stack-sm">
    <label htmlFor="authorId">Author <span>Required</span></label>
    <select id="authorId" name="authorId" className="input" required value={selected} disabled={busy} onChange={event => { const id=event.currentTarget.value; setSelected(id); setName(""); setMessage(""); onChange?.(id, options.find(option => option.id === id)?.display_name ?? ""); }}>
      <option value="" disabled>Choose an author</option>{options.map(item => <option key={item.id} value={item.id}>{item.display_name}</option>)}
    </select>
    <label htmlFor="custom-author-name">Or type a new author</label>
    <input id="custom-author-name" className="input" value={name} maxLength={120} disabled={busy} onChange={event => { setName(event.currentTarget.value); setSelected(""); setMessage(""); onChange?.("", ""); }} placeholder="Author name" />
    <button type="button" className="btn-secondary" disabled={busy || !name.trim()} onClick={() => void add()}>{busy ? "Adding…" : "Add and select author"}</button>
    <small>Adding an author saves a reusable byline and requires publishing access. Select an existing name to avoid duplicates.</small>
    {message ? <p role="status" aria-live="polite">{message}</p> : null}
  </div>;
}
