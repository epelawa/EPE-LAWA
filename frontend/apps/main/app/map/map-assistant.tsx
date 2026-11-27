"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { EPE_DIVISION_BBOX, EPE_DIVISION_BOUNDS, epeScopedQuery, insideEpeDivision } from "../../lib/epe-area";
import styles from "./map-assistant.module.css";

type CoordinateSource = "verified" | "openstreetmap";
type Place = { name: string; query: string; latitude?: number; longitude?: number; pinSource?: CoordinateSource };
type Turn = { role: "user" | "assistant"; text: string; places?: Place[]; offTopic?: boolean };

const SUGGESTIONS = [
  "How do I get to Epe Fish Market from Lekki?",
  "Where can I find a pharmacy near Eredo?",
  "What is the best route from Awoyaya to Epe town?",
];

function coordinate(place: Place): string | null {
  const { latitude, longitude } = place;
  return typeof latitude === "number" && typeof longitude === "number" && insideEpeDivision(latitude, longitude)
    ? `${latitude.toFixed(6)},${longitude.toFixed(6)}`
    : null;
}

function directionsHref(place: Place) {
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("destination", coordinate(place) ?? epeScopedQuery(place.query));
  return url.toString();
}

function mapPreviewHref(place: Place) {
  const url = new URL("https://www.openstreetmap.org/export/embed.html");
  const point = coordinate(place);
  if (point) {
    const [lat, lon] = point.split(",").map(Number);
    const { west, south, east, north } = EPE_DIVISION_BOUNDS;
    const westView = Math.max(west, lon - 0.02);
    const eastView = Math.min(east, lon + 0.02);
    const southView = Math.max(south, lat - 0.015);
    const northView = Math.min(north, lat + 0.015);
    url.searchParams.set("bbox", `${westView},${southView},${eastView},${northView}`);
    url.searchParams.set("marker", point);
  } else {
    url.searchParams.set("bbox", EPE_DIVISION_BBOX);
  }
  url.searchParams.set("layer", "mapnik");
  return url.toString();
}

function BrainWaveMark() {
  return <svg className={styles.brainWave} viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <path className={styles.brainOutline} d="M32 8c-4.1-4.7-12.2-2.9-14.1 3.1-6.2-.3-10.4 6.6-7.6 12.2-5.3 4.6-3.8 12.8 2.6 15.2-.8 6.4 5.4 11.4 11.4 9.3C27 53.3 30 56 32 56s5-2.7 7.7-8.2c6 2.1 12.2-2.9 11.4-9.3 6.4-2.4 7.9-10.6 2.6-15.2 2.8-5.6-1.4-12.5-7.6-12.2C44.2 5.1 36.1 3.3 32 8Z" />
    <path className={styles.brainDivider} d="M32 9v44" />
    <path className={styles.waveTrace} d="M12 31h8l4-9 7 21 7-26 7 28 4-14h5" />
  </svg>;
}

export default function MapAssistant() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLOListElement>(null);

  useEffect(() => { logRef.current?.lastElementChild?.scrollIntoView({ block: "nearest" }); }, [turns, busy]);

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
      const data = (await response.json().catch(() => null)) as { reply?: { answer: string; places: Place[]; offTopic?: boolean }; error?: string } | null;
      if (!response.ok || !data?.reply) { setError(data?.error ?? "The assistant could not answer just now. Please try again."); return; }
      setTurns([...next, { role: "assistant", text: data.reply.answer, places: data.reply.places, offTopic: data.reply.offTopic }]);
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

  return <section className={styles.root} aria-labelledby="map-assistant-title">
    <header className={styles.hero}>
      <div className={styles.identity}>
        <span className={styles.mark}><BrainWaveMark /></span>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>EPE LAWA · MAP ASSISTANT</p>
          <h1 id="map-assistant-title">Where are you headed?</h1>
          <p className={styles.subhead}>Ask about routes, streets and local places across Epe Division.</p>
        </div>
      </div>
      <span className={styles.areaBadge}><span aria-hidden="true" className={styles.liveDot} /> Epe Division only</span>
    </header>

    <div className={styles.workspace}>
      <ol ref={logRef} className={styles.log} aria-live="polite" aria-relevant="additions text">
        <li className={`${styles.message} ${styles.bot}`}>
          <span className={styles.speaker}>EPE LAWA ASSISTANT</span>
          <p>Tell me where you’re starting and where you want to go. I’ll use approved local knowledge and bounded map search results; any unverified pin is labelled.</p>
        </li>
        {turns.map((turn, index) => <li key={index} className={`${styles.message} ${turn.role === "user" ? styles.me : styles.bot}`}>
          <span className={styles.speaker}>{turn.role === "user" ? "YOU" : "EPE LAWA ASSISTANT"}</span>
          <p>{turn.text}</p>
          {turn.role === "assistant" && !turn.offTopic && turn.places?.length ? <div className={styles.destinations}>
            {turn.places.map((place) => {
              const point = coordinate(place);
              return <div key={`${place.name}-${place.query}`} className={styles.destination}>
                <div className={styles.destinationHeading}>
                  <span className={styles.pinIcon} aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg></span>
                  <div><strong>{place.name}</strong><span className={styles.pinStatus}>{place.pinSource === "verified" ? "Human-verified EPE LAWA location" : place.pinSource === "openstreetmap" ? "OpenStreetMap search pin · not staff-verified" : "No verified pin available · map shows Epe Division"}</span></div>
                </div>
                <div className={styles.mapFrameWrap}>
                  <iframe title={`OpenStreetMap preview for ${place.name}`} src={mapPreviewHref(place)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" sandbox="allow-same-origin allow-scripts allow-popups" />
                </div>
                <a className={styles.directionsLink} href={directionsHref(place)} target="_blank" rel="noopener noreferrer">
                  <span>{point ? "Open pinned directions in Google Maps" : "Search this destination in Google Maps"}</span>
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </div>;
            })}
          </div> : null}
        </li>)}
        {busy ? <li className={`${styles.message} ${styles.bot} ${styles.thinking}`} role="status"><span className="sr-only">The assistant is thinking…</span><i /><i /><i /></li> : null}
      </ol>

      {!turns.length ? <div className={styles.suggestions} aria-label="Suggested questions">{SUGGESTIONS.map((item) => <button key={item} type="button" onClick={() => void ask(item)} disabled={busy}>{item}</button>)}</div> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <form className={styles.form} onSubmit={submit}>
        <label htmlFor={inputId} className="sr-only">Ask about directions or a place in Epe Division</label>
        <textarea id={inputId} ref={inputRef} rows={2} value={text} maxLength={500} placeholder="Ask about a route, street or local place…" onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void ask(text); } }} />
        <button type="submit" className={styles.send} disabled={busy || !text.trim()} aria-label="Ask the assistant">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
        </button>
      </form>
      <div className={styles.footnote}>
        <span>AI can be wrong. Confirm routes and travel conditions locally.</span>
        <a href="#map-corrections">Share a map correction for review</a>
      </div>
    </div>
  </section>;
}
