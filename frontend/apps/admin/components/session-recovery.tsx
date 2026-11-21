"use client";

import { useEffect, useState, type RefObject } from "react";

// Tab-local convenience enabled by default, not a server draft or a security boundary.
const FIELDS = ["title", "summary", "body", "categoryId", "authorId", "coverUrl", "coverAlt", "coverCredit", "coverSourceUrl", "coverLicenseUrl", "coverCaption", "seoTitle", "seoDescription"] as const;
const MAX_AGE = 24 * 60 * 60 * 1000;
type Snapshot = { version: 1; savedAt: number; revision: string; fields: Record<string, string> };
export function recoveryKey(actor: string, article: string) { return `epelawa:news-recovery:v1:${actor}:${article}`; }
export function clearSessionRecovery(actor: string | undefined, article: string) {
  if (!actor) return;
  try { sessionStorage.removeItem(recoveryKey(actor, article)); } catch { /* storage is optional */ }
}
function read(key: string): Snapshot | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw || raw.length > 150_000) return null;
    const value = JSON.parse(raw) as Snapshot;
    if (value.version !== 1 || !Number.isFinite(value.savedAt) || value.savedAt > Date.now() || Date.now() - value.savedAt > MAX_AGE || typeof value.revision !== "string" || !value.fields || typeof value.fields !== "object" || Array.isArray(value.fields)) { sessionStorage.removeItem(key); return null; }
    return value;
  } catch { return null; }
}
function apply(form: HTMLFormElement, fields: Record<string, string>) {
  const unavailable: string[] = [];
  for (const name of FIELDS) {
    const value = fields[name];
    if (typeof value !== "string") continue;
    const el = form.elements.namedItem(name);
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) continue;
    if (el instanceof HTMLSelectElement && value && !Array.from(el.options).some(option => option.value === value && !option.disabled)) { unavailable.push(name); continue; }
    const prototype = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(el, value);
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
  }
  return unavailable;
}

export default function SessionRecovery({ form, actor, article, revision, saved = false }: { form: RefObject<HTMLFormElement | null>; actor?: string; article: string; revision: string; saved?: boolean }) {
  const [enabled, setEnabled] = useState(true);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [message, setMessage] = useState("");
  const key = actor ? recoveryKey(actor, article) : "";
  useEffect(() => { if (key) setSnapshot(read(key)); }, [key]);
  useEffect(() => {
    const el = form.current;
    if (!key || !el || !enabled || saved) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function save() {
      const fields: Record<string, string> = {};
      const data = new FormData(el!);
      for (const field of FIELDS) { const value = data.get(field); if (typeof value === "string") fields[field] = value; }
      try { sessionStorage.setItem(key, JSON.stringify({ version: 1, savedAt: Date.now(), revision, fields })); setMessage("Recovery copy saved in this tab; it has not been saved to the newsroom."); }
      catch { setEnabled(false); setMessage("Browser recovery is unavailable. Copy your work somewhere safe before leaving."); }
    }
    function schedule() { clearTimeout(timer); timer = setTimeout(save, 500); }
    el.addEventListener("input", schedule); el.addEventListener("change", schedule);
    return () => { clearTimeout(timer); el.removeEventListener("input", schedule); el.removeEventListener("change", schedule); };
  }, [enabled, form, key, revision, saved]);
  if (!actor || saved) return null;
  function discard() { clearSessionRecovery(actor, article); setSnapshot(null); setEnabled(false); setMessage("Browser recovery copy removed."); }
  function restore() {
    if (!form.current || !snapshot) return;
    const missing = apply(form.current, snapshot.fields);
    setSnapshot(null); setEnabled(true);
    setMessage(missing.length ? "Recovered the available fields. A saved author or category is no longer available; select it again." : "Recovery copy restored in this form. Review it before saving.");
  }
  return <section className="ui-stack-sm" aria-label="Browser recovery">
    {snapshot ? <><p role="status">A recovery copy from {new Date(snapshot.savedAt).toLocaleString()} is available{snapshot.revision !== revision ? "; the article revision has changed, so compare carefully before saving" : ""}.</p><div className="ui-actions"><button className="btn-secondary" type="button" onClick={restore}>Restore recovery copy</button><button className="btn-secondary" type="button" onClick={discard}>Discard recovery copy</button></div></> : <div className="ui-actions">{enabled ? <button className="btn-secondary" type="button" onClick={discard}>Stop recovery and remove copy</button> : <button className="btn-secondary" type="button" onClick={() => { setEnabled(true); setMessage("Recovery enabled in this tab."); }}>Turn recovery back on</button>}</div>}
    {message && <p role="status">{message}</p>}
  </section>;
}
