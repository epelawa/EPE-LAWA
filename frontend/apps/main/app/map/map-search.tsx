"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { FilterIcon, MapPinIcon, SearchIcon } from "../../components/icons";
import HumanCheck from "../../components/human-check";
import { Notice, Panel, SectionHeading } from "../../components/design-system";
import styles from "./map.module.css";
import { epeScopedQuery, insideEpeDivision } from "../../lib/epe-area";

type Business = { slug: string; name: string; category_label: string; area: string | null; address: string | null; landmark: string | null };
const MAPS_ORIGIN = "https://www.google.com/maps/";

/* Searches stay scoped to Epe Division. Manual origin/destination text and device location stay in this browser until a visitor opens Google Maps. */
export function mapsSearchUrl(query: string) {
  const url = new URL("search/", MAPS_ORIGIN);
  url.searchParams.set("api", "1");
  url.searchParams.set("query", epeScopedQuery(query));
  return url.toString();
}
export function mapsDirectionsUrl(destination: string, origin?: string) {
  const url = new URL("dir/", MAPS_ORIGIN);
  url.searchParams.set("api", "1");
  url.searchParams.set("destination", epeScopedQuery(destination));
  if (origin) url.searchParams.set("origin", origin.includes(",") && /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/.test(origin) ? origin : epeScopedQuery(origin));
  return url.toString();
}
/** A Google Maps embed frame; no Maps API key is used or required for this embed. */
export function googleEmbedUrl(query: string) {
  const url = new URL(MAPS_ORIGIN);
  url.searchParams.set("q", epeScopedQuery(query));
  url.searchParams.set("z", "12");
  url.searchParams.set("output", "embed");
  return url.toString();
}

export default function MapSearch({ businesses, businessError = false }: { businesses: Business[]; businessError?: boolean }) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [mapVisible, setMapVisible] = useState(false);
  const [selectedBusinessSlug, setSelectedBusinessSlug] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [correctionBusy, setCorrectionBusy] = useState(false);
  const [correctionMessage, setCorrectionMessage] = useState("");
  const [correctionError, setCorrectionError] = useState(false);
  const [humanRound, setHumanRound] = useState(0);
  const correctionId = useId();
  const q = query.trim().toLocaleLowerCase();
  const matches = useMemo(() => q ? businesses.filter((b) => [b.name, b.category_label, b.area, b.address, b.landmark].filter(Boolean).join(" ").toLocaleLowerCase().includes(q)).slice(0, 10) : [], [businesses, q]);
  const selectedBusiness = businesses.find((business) => business.slug === selectedBusinessSlug) ?? null;
  const selectedDestination = selectedBusiness
    ? [selectedBusiness.name, selectedBusiness.address, selectedBusiness.landmark, selectedBusiness.area].filter(Boolean).join(", ")
    : query.trim();
  const coords = location ? location.split(",").map(Number) : null;
  const lat = coords && Number.isFinite(coords[0]) ? coords[0] : null;
  const lon = coords && Number.isFinite(coords[1]) ? coords[1] : null;
  const inside = lat !== null && lon !== null && insideEpeDivision(lat, lon);
  const embedUrl = googleEmbedUrl(inside ? `${lat!.toFixed(5)},${lon!.toFixed(5)}` : selectedDestination || destination || "Epe Division");

  const requestLocation = () => {
    setLocation(null);
    setMapVisible(true);
    if (!window.isSecureContext) { setLocationMessage("Location requires a secure (HTTPS) connection. You can still search manually."); return; }
    if (!navigator.geolocation) { setLocationMessage("Location is not supported by this browser. You can still search manually."); return; }
    setLocationMessage("Requesting location permission…");
    navigator.geolocation.getCurrentPosition((position) => {
      setLocation(`${position.coords.latitude},${position.coords.longitude}`);
      setLocationMessage(insideEpeDivision(position.coords.latitude, position.coords.longitude)
        ? "Your position is marked on the Epe Division map below. Coordinates stay in this browser tab and are sent to Google only if you open directions there."
        : "You are outside Epe Division, so the map stays on Epe Division. Your location is kept in this tab and sent to Google only if you open directions there.");
    }, (error) => {
      const message = error.code === error.PERMISSION_DENIED
        ? "Location permission was denied. You can still search manually."
        : error.code === error.TIMEOUT
          ? "Location request timed out. You can still search manually."
          : "Your location is unavailable. You can still search manually.";
      setLocationMessage(message);
    }, { maximumAge: 60000, timeout: 10000 });
  };

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setMapVisible(true);
    if (query.trim()) setDestination(query.trim());
  }

  function submitDirections(event: FormEvent) {
    event.preventDefault();
    setMapVisible(true);
  }

  async function submitCorrection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (correctionBusy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setCorrectionBusy(true);
    setCorrectionMessage("");
    setCorrectionError(false);
    try {
      const response = await fetch("/api/map/corrections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          place_name: data.get("place_name"),
          details: data.get("details"),
          directions_query: data.get("directions_query"),
          source_note: data.get("source_note"),
          source_url: data.get("source_url"),
          website: data.get("website"),
          hc_token: data.get("hc-token"),
          hc_solution: data.get("hc-solution"),
          turnstile_token: data.get("cf-turnstile-response"),
        }),
      });
      const result = await response.json().catch(() => null) as { error?: string; message?: string } | null;
      if (!response.ok) {
        setCorrectionError(true);
        setCorrectionMessage(result?.error ?? "Your correction could not be sent. Please try again later.");
      } else {
        form.reset();
        setCorrectionMessage(result?.message ?? "Thank you. Your correction is private and will be checked by a human before it can inform the assistant.");
      }
    } catch {
      setCorrectionError(true);
      setCorrectionMessage("You seem to be offline. Your correction was not saved; please try again.");
    } finally {
      setCorrectionBusy(false);
      setHumanRound((round) => round + 1);
    }
  }

  return <div className="ui-stack">
    <section className="ui-stack" aria-labelledby="manual-map-title">
      <form onSubmit={submitSearch} className="ui-toolbar filter-panel filter-panel--compact" role="search" aria-label="Search map places">
        <div className="filter-panel__heading"><span className="filter-panel__icon" aria-hidden="true"><FilterIcon/></span><div><p className="ui-eyebrow">Manual map search</p><h2 id="manual-map-title" className="filter-panel__title">Find a place</h2></div></div>
        <div className="ui-field ui-field--wide"><label htmlFor="map-query" className="label sr-only">Street, landmark, business or address</label><div className="filter-panel__control"><SearchIcon className="filter-panel__input-icon"/><input id="map-query" type="text" value={query} onChange={(event) => { setQuery(event.target.value.slice(0, 200)); setSelectedBusinessSlug(null); }} maxLength={200} autoComplete="off" placeholder="Street, landmark, business or address" className="input w-full" aria-describedby="map-query-hint"/></div></div>
        <div className="ui-actions"><button type="submit" className="btn-secondary">Search and show map</button><button type="button" className="btn-secondary" onClick={requestLocation} aria-describedby="map-location-status"><MapPinIcon size={16}/>Use my location</button></div>
        <p id="map-query-hint" className="filter-panel__hint">Published businesses are matched locally. The map is loaded only after you choose search or location. Other places are sent to Google Maps only if you open a result.</p>
      </form>
      <p id="map-location-status" className="ui-muted" aria-live="polite">{locationMessage}</p>

      <Panel className={`ui-card ${styles.mapPanel}`}>
        <SectionHeading eyebrow="Manual directions" title="Choose a start and destination" description="Enter places in Epe Division. Your entries stay in this tab until you choose to open directions in Google Maps." />
        <form onSubmit={submitDirections} className="ui-stack">
          <div className="ui-form-grid">
            <div className="ui-field"><label className="label" htmlFor="map-origin">Starting point</label><input className="input" id="map-origin" value={origin} onChange={(event) => setOrigin(event.target.value.slice(0, 200))} maxLength={200} placeholder="e.g. Lekki Phase 1 or Epe town" /></div>
            <div className="ui-field"><label className="label" htmlFor="map-destination">Destination</label><input className="input" id="map-destination" value={destination} onChange={(event) => setDestination(event.target.value.slice(0, 200))} maxLength={200} placeholder="e.g. Epe Fish Market" required /></div>
          </div>
          <div className="ui-actions"><button className="btn-secondary" type="submit">Prepare directions</button>
            {destination.trim() ? <a className="btn-primary" target="_blank" rel="noopener noreferrer" href={mapsDirectionsUrl(destination.trim(), location || origin.trim() || undefined)}>Open directions in Google Maps <span className="sr-only">(opens in a new tab)</span></a> : null}
          </div>
        </form>
      </Panel>

      <details className="fine-print">
        <summary>About Google Maps and your location</summary>
        <p>Search and directions on Google Maps are provided by Google. Device location is requested only after you click Use my location. EPE LAWA does not store your coordinates; Google receives entered places or your location only if you choose to open a Google Maps link.</p>
      </details>

      {mapVisible ? <Panel className={`ui-card ${styles.mapPanel}`}>
        <SectionHeading eyebrow="Free map, no sign-in" title="Epe Division on the map" id="epe-embed-map" description="The map shows Epe Division: Epe, Eredo, Ikosi-Ejinrin, Ibeju-Lekki and Lekki. Your device location is marked only when you explicitly requested it and are inside the division." />
        <iframe title="Epe Division map on Google Maps" src={embedUrl} loading="lazy" className={styles.mapFrame} referrerPolicy="no-referrer-when-downgrade" sandbox="allow-same-origin allow-scripts allow-popups allow-forms" />
        <div className="ui-actions">
          <a className="btn-secondary" target="_blank" rel="noopener noreferrer" href={mapsSearchUrl(selectedDestination || destination || "Epe")}>Search this in Google Maps <span className="sr-only">(opens in a new tab)</span></a>
        </div>
        <p className="ui-meta">Map data and search are provided by Google Maps. No Maps API key or sign-in is used.</p>
      </Panel> : <p className="ui-muted">The map preview stays closed until you choose Search and show map or Use my location.</p>}

      {businessError ? <Notice tone="neutral">Published business listings could not be loaded just now. This is different from no matching listings; manual street and landmark search remains available.</Notice> : null}
      {q && <Panel className="ui-card" aria-live="polite" aria-labelledby="map-results-title">
        <SectionHeading eyebrow="Search results" title={matches.length ? "Published business matches" : businessError ? "Local business data unavailable" : "No published business matches"} id="map-results-title" />
        {matches.length ? <ul className="ui-list ui-results">{matches.map((business) => {
          const address = [business.name, business.address, business.landmark, business.area].filter(Boolean).join(", ");
          const selected = selectedBusiness?.slug === business.slug;
          return <li key={business.slug} className="ui-item">
            <h3 className="ui-item-title">{business.name}</h3>
            <p className="ui-meta">{[business.category_label, business.address, business.landmark, business.area].filter(Boolean).join(" · ")}</p>
            <div className="ui-actions">
              <button type="button" className="btn-secondary" aria-pressed={selected} aria-label={`${selected ? "Selected" : "Use"} ${business.name} as the directions destination`} onClick={() => { setSelectedBusinessSlug(business.slug); setDestination(address); }}> {selected ? "Selected destination" : "Use for directions"}</button>
              <a className="ui-text-link" target="_blank" rel="noopener noreferrer" href={mapsSearchUrl(address)}>Open business in Google Maps <span className="sr-only">(opens in a new tab)</span></a>
            </div>
          </li>;
        })}</ul> : businessError
          ? <p className="ui-muted">The local listings are unavailable, so no-match status cannot be determined. Search a street or landmark in Google Maps below.</p>
          : <p className="ui-muted">No approved listing matched that text. Search streets and landmarks directly in Google Maps below.</p>}
        {selectedBusiness ? <p className="ui-meta" role="status">Directions destination: {selectedDestination}. Confirm the destination and route before travel.</p> : null}
        <div className="ui-actions">
          <a className="btn-primary" target="_blank" rel="noopener noreferrer" href={mapsSearchUrl(selectedDestination)}>Search in Google Maps <span className="sr-only">(opens in a new tab)</span></a>
          <a className="btn-secondary" target="_blank" rel="noopener noreferrer" href={mapsDirectionsUrl(selectedDestination, location || origin.trim() || undefined)}>{selectedBusiness ? `Get directions to ${selectedBusiness.name}` : "Get directions"} <span className="sr-only">(opens in a new tab)</span></a>
        </div>
      </Panel>}
    </section>

    <section id="map-corrections" className="ui-stack" aria-labelledby="map-corrections-title">
      <SectionHeading eyebrow="Help improve local map knowledge" title="Share a correction for human review" id="map-corrections-title" description="Tell us what is wrong or missing. Your submission stays private and will not be used by the assistant unless a reviewer verifies and approves it." />
      <form className="ui-stack ui-card" onSubmit={submitCorrection}>
        <div className="ui-field"><label className="label" htmlFor={`${correctionId}-place`}>Place or route name</label><input className="input" id={`${correctionId}-place`} name="place_name" minLength={2} maxLength={160} required /></div>
        <div className="ui-field"><label className="label" htmlFor={`${correctionId}-details`}>Correction or local information</label><textarea className="input" id={`${correctionId}-details`} name="details" minLength={10} maxLength={2000} rows={4} required /></div>
        <div className="ui-field"><label className="label" htmlFor={`${correctionId}-query`}>Suggested map search phrase (optional)</label><input className="input" id={`${correctionId}-query`} name="directions_query" maxLength={240} /></div>
        <div className="ui-field"><label className="label" htmlFor={`${correctionId}-source`}>How can a reviewer verify this? (optional)</label><textarea className="input" id={`${correctionId}-source`} name="source_note" maxLength={1000} rows={2} /></div>
        <div className="ui-field"><label className="label" htmlFor={`${correctionId}-url`}>Supporting source URL (HTTPS, optional)</label><input className="input" id={`${correctionId}-url`} name="source_url" type="url" maxLength={500} placeholder="https://…" /></div>
        <div hidden aria-hidden="true"><label>Leave this field empty<input name="website" autoComplete="off" tabIndex={-1} /></label></div>
        <HumanCheck resetOn={humanRound} />
        <button className="btn-primary" type="submit" disabled={correctionBusy}>{correctionBusy ? "Sending for review…" : "Submit private correction"}</button>
        {correctionMessage ? <p role={correctionError ? "alert" : "status"} className={correctionError ? "ui-form-error" : "ui-form-success"}>{correctionMessage}</p> : null}
      </form>
    </section>
  </div>;
}
