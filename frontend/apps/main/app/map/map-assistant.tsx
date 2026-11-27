"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { epeScopedQuery } from "../../lib/epe-area";
import styles from "./map-assistant.module.css";

type Turn = { role: "user" | "assistant"; text: string; places?: { name: string; query: string }[] };

const SUGGESTIONS = ["How do I get to Epe Fish Market from Lekki?", "Where can I find a pharmacy near Eredo?", "Best way from Awoyaya to Epe town?"];

function directionsHref(query: string) {
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("destination", epeScopedQuery(query));
  return url.toString();
}

/**
 * Floating map assistant (owner brief, turn 26): an AI chat bubble that answers
 * place and route questions inside Epe Division only. Server-side only AI; the
 * browser just posts the conversation to /api/map/assistant.
 */
export default function MapAssistant() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const panelId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLOListElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { if (open) inputRef.current?.focus({ preventScroll: true }); }, [open]);
  useEffect(() => { logRef.current?.lastElementChild?.scrollIntoView({ block: "end" }); }, [turns, busy]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); toggleRef.current?.focus(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function ask(question: string) {
    const clean = question.replace(/\s+/g, " ").trim().slice(0, 500);
    if (!clean || busy) return;
    const next: Turn[] = [...turns, { role: "user", text: clean }];
    setTurns(next);
    setText("");
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/map/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ turns: next.slice(-8).map(({ role, text: body }) => ({ role, text: body })) }),
      });
      const data = (await response.json().catch(() => null)) as { reply?: { answer: string; places: Turn["places"] }; error?: string } | null;
      if (!response.ok || !data?.reply) { setError(data?.error ?? "The assistant could not answer just now. Please try again."); return; }
      setTurns([...next, { role: "assistant", text: data.reply.answer, places: data.reply.places }]);
    } catch {
      setError("You seem to be offline. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(text);
  }

  return <div className={styles.root}>
    {open ? <section id={panelId} className={styles.panel} role="dialog" aria-modal="false" aria-label="Epe directions assistant">
      <header className={styles.head}>
        <span className={styles.avatar} aria-hidden="true">🤖</span>
        <div><p className={styles.name}>Epe directions assistant</p><p className={styles.sub}>Places and routes in Epe Division only</p></div>
        <button type="button" className={styles.close} onClick={() => { setOpen(false); toggleRef.current?.focus(); }} aria-label="Close the assistant">×</button>
      </header>
      <ol ref={logRef} className={styles.log} aria-live="polite">
        <li className={`${styles.bubble} ${styles.bot}`}>Hi! Ask me how to get somewhere in Epe, Eredo, Ikosi-Ejinrin, Ibeju-Lekki or Lekki. I use the EPE LAWA directory and live map search.</li>
        {turns.map((turn, index) => <li key={index} className={`${styles.bubble} ${turn.role === "user" ? styles.me : styles.bot}`}>
          <span className="sr-only">{turn.role === "user" ? "You: " : "Assistant: "}</span>{turn.text}
          {turn.places?.length ? <span className={styles.places}>{turn.places.map((place) => <a key={place.query} href={directionsHref(place.query)} target="_blank" rel="noopener noreferrer" className={styles.place}>📍 {place.name}<span className="sr-only"> (directions open in Google Maps in a new tab)</span></a>)}</span> : null}
        </li>)}
        {busy ? <li className={`${styles.bubble} ${styles.bot} ${styles.typing}`} role="status"><span className="sr-only">The assistant is thinking…</span><i /><i /><i /></li> : null}
      </ol>
      {!turns.length ? <div className={styles.suggestions}>{SUGGESTIONS.map((item) => <button key={item} type="button" className={styles.suggestion} onClick={() => void ask(item)} disabled={busy}>{item}</button>)}</div> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <form className={styles.form} onSubmit={submit}>
        <label htmlFor={`${panelId}-q`} className="sr-only">Your question</label>
        <textarea id={`${panelId}-q`} ref={inputRef} rows={1} value={text} maxLength={500} placeholder="Where do you want to go?" onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void ask(text); } }} />
        <button type="submit" className={styles.send} disabled={busy || !text.trim()} aria-label="Send">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4z" /></svg>
        </button>
      </form>
      <p className={styles.fine}>AI answers can be wrong. Confirm routes and fares locally before you travel.</p>
    </section> : null}
    <button ref={toggleRef} type="button" className={styles.toggle} onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls={open ? panelId : undefined}>
      <span aria-hidden="true" className={styles.toggleEmoji}>🤖</span>
      <span className={styles.toggleLabel}>{open ? "Close" : "Ask for directions"}</span>
    </button>
  </div>;
}
