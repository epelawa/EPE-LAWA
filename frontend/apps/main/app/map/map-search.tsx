"use client";

import { useMemo, useState } from "react";
import { FilterIcon, MapPinIcon, SearchIcon } from "../../components/icons";
import { Notice, Panel, SectionHeading } from "../../components/design-system";
import styles from "./map.module.css";
import { EPE_DIVISION_BBOX, EPE_TOWN_VIEW, epeScopedQuery, insideEpeDivision } from "../../lib/epe-area";

type Business = { slug: string; name: string; category_label: string; area: string | null; address: string | null; landmark: string | null };
const MAPS_ORIGIN = "https://www.google.com/maps/";
const OSM_ORIGIN = "https://www.openstreetmap.org/";
/* Owner brief (turn 26): the map shows Epe Division only (Epe, Eredo, Ikosi-Ejinrin, Ibeju-Lekki, Lekki)
   and never re-centres on a visitor who is elsewhere. Searches are always scoped to Epe Division. */
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
  if (origin) url.searchParams.set("origin", origin);
  return url.toString();
}
export function osmSearchUrl(query: string) {
  const url = new URL("search", OSM_ORIGIN);
  url.searchParams.set("query", epeScopedQuery(query));
  return url.toString();
}
export function osmEmbedUrl(bbox: string, marker?: string) {
  const url = new URL("export/embed.html", OSM_ORIGIN);
  url.searchParams.set("bbox", bbox);
  url.searchParams.set("layer", "mapnik");
  if (marker) url.searchParams.set("marker", marker);
  return url.toString();
}

export default function MapSearch({ businesses, businessError = false }: { businesses: Business[]; businessError?: boolean }) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [selectedBusinessSlug, setSelectedBusinessSlug] = useState<string | null>(null);
  const q = query.trim().toLocaleLowerCase();
  const matches = useMemo(() => q ? businesses.filter((b) => [b.name, b.category_label, b.area, b.address, b.landmark].filter(Boolean).join(" ").toLocaleLowerCase().includes(q)).slice(0, 10) : [], [businesses, q]);
  const selectedBusiness = businesses.find((business) => business.slug === selectedBusinessSlug) ?? null;
  const selectedDestination = selectedBusiness
    ? [selectedBusiness.name, selectedBusiness.address, selectedBusiness.landmark, selectedBusiness.area].filter(Boolean).join(", ")
    : query.trim();
  const coords = location ? location.split(",").map(Number) : null;
  const lat = coords && Number.isFinite(coords[0]) ? coords[0] : null;
  const lon = coords && Number.isFinite(coords[1]) ? coords[1] : null;
  // The map always frames Epe Division; a visitor's own position is only marked when it is inside it.
  const inside = lat !== null && lon !== null && insideEpeDivision(lat, lon);
  const embedUrl = osmEmbedUrl(EPE_DIVISION_BBOX, inside ? `${lat.toFixed(5)},${lon.toFixed(5)}` : undefined);
  const requestLocation = () => {
    setLocation(null);
    if (!window.isSecureContext) { setLocationMessage("Location requires a secure (HTTPS) connection. You can still search manually."); return; }
    if (!navigator.geolocation) { setLocationMessage("Location is not supported by this browser. You can still search manually."); return; }
    setLocationMessage("Requesting location permission…");
    navigator.geolocation.getCurrentPosition((position) => {
      setLocation(`${position.coords.latitude},${position.coords.longitude}`);
      setLocationMessage(insideEpeDivision(position.coords.latitude, position.coords.longitude)
        ? "Your position is marked on the Epe Division map below and used as the start of directions. Coordinates stay in this browser tab and are never sent to EPE LAWA; Google receives them only if you continue into Google Maps."
        : "You are outside Epe Division, so the map stays on Epe Division. Your position is used only as the start of directions in Google Maps, and is never sent to EPE LAWA.");
    }, (error) => {
      const message = error.code === error.PERMISSION_DENIED
        ? "Location permission was denied. You can still search manually."
        : error.code === error.TIMEOUT
          ? "Location request timed out. You can still search manually."
          : "Your location is unavailable. You can still search manually.";
      setLocationMessage(message);
    }, { maximumAge: 60000, timeout: 10000 });
  };
  return <div className="ui-stack">
    <form onSubmit={(event) => event.preventDefault()} className="ui-toolbar filter-panel filter-panel--compact" role="search" aria-label="Search map places">
      <div className="filter-panel__heading"><span className="filter-panel__icon" aria-hidden="true"><FilterIcon/></span><div><p className="ui-eyebrow">Map & navigation</p><h2 className="filter-panel__title">Find a place</h2></div></div>
      <div className="ui-field ui-field--wide"><label htmlFor="map-query" className="label sr-only">Street, landmark, business or address</label><div className="filter-panel__control"><SearchIcon className="filter-panel__input-icon"/><input id="map-query" type="text" value={query} onChange={(event) => { setQuery(event.target.value.slice(0, 200)); setSelectedBusinessSlug(null); }} maxLength={200} autoComplete="off" placeholder="Street, landmark, business or address" className="input w-full" aria-describedby="map-query-hint"/></div></div>
      {/* A real button click is the user gesture browsers require before showing the location permission prompt. */}
      <div className="ui-actions"><button type="button" className="btn-secondary" onClick={requestLocation} aria-describedby="map-location-status"><MapPinIcon size={16}/>Use my location</button></div>
      <p id="map-query-hint" className="filter-panel__hint">Published businesses are matched locally; other places are handed to Google Maps only when you choose.</p>
    </form>
    <p id="map-location-status" className="ui-muted" aria-live="polite">{locationMessage}</p>
    <details className="fine-print">
      <summary>About Google Maps and your location</summary>
      <p>Search and directions on Google Maps are provided by an external service operated by Google. Your device location is shared with Google only if you open directions while location sharing is enabled; EPE LAWA does not store your coordinates.</p>
    </details>
    <Panel className={`ui-card ${styles.mapPanel}`}>
      <SectionHeading eyebrow="Free map, no sign-in" title="Epe Division on the map" id="epe-embed-map" description="The map shows Epe Division: Epe, Eredo, Ikosi-Ejinrin, Ibeju-Lekki and Lekki. Use my location marks you on it when you are inside Epe Division and sets the start of your directions; your coordinates stay in this browser tab." />
      <iframe 
        title="Epe Division map" 
        src={embedUrl} 
        loading="lazy" 
        className={styles.mapFrame}
        referrerPolicy="no-referrer-when-downgrade"
        sandbox="allow-same-origin allow-scripts allow-popups"
      />
      <div className="ui-actions">
        <a className="btn-secondary" target="_blank" rel="noopener noreferrer" href={osmSearchUrl(selectedDestination || "Epe")}>Search this in OpenStreetMap <span className="sr-only">(opens in a new tab)</span></a>
        <a className="btn-secondary" target="_blank" rel="noopener noreferrer" href={`https://www.openstreetmap.org/#map=${EPE_TOWN_VIEW}`}>Open Epe town on OpenStreetMap <span className="sr-only">(opens in a new tab)</span></a>
      </div>
      <p className="ui-meta">Map data and search are provided by OpenStreetMap contributors. It is free to use and needs no account. Google Maps is opened only when you choose to get directions there.</p>
    </Panel>
    {businessError ? <Notice tone="neutral">Published business listings could not be loaded just now. This is different from no matching listings; manual street and landmark search in Google Maps remains available.</Notice> : null}
    {q && <Panel className="ui-card" aria-live="polite" aria-labelledby="map-results-title">
      <SectionHeading eyebrow="Search results" title={matches.length ? "Published business matches" : businessError ? "Local business data unavailable" : "No published business matches"} id="map-results-title"/>
      {matches.length ? <ul className="ui-list ui-results">{matches.map((business) => {
        const address = [business.name, business.address, business.landmark, business.area].filter(Boolean).join(", ");
        const selected = selectedBusiness?.slug === business.slug;
        return <li key={business.slug} className="ui-item">
          <h3 className="ui-item-title">{business.name}</h3>
          <p className="ui-meta">{[business.category_label, business.address, business.landmark, business.area].filter(Boolean).join(" · ")}</p>
          <div className="ui-actions">
            <button type="button" className="btn-secondary" aria-pressed={selected} aria-label={`${selected ? "Selected" : "Use"} ${business.name} as the directions destination`} onClick={() => setSelectedBusinessSlug(business.slug)}>{selected ? "Selected destination" : "Use for directions"}</button>
            <a className="ui-text-link" target="_blank" rel="noopener noreferrer" href={mapsSearchUrl(address)}>Open business in Google Maps <span className="sr-only">(opens in a new tab)</span></a>
          </div>
        </li>;
      })}</ul> : businessError
        ? <p className="ui-muted">The local listings are unavailable, so no-match status cannot be determined. Search a street or landmark in Google Maps below.</p>
        : <p className="ui-muted">No approved listing matched that text. Search streets and landmarks directly in Google Maps below.</p>}
      {selectedBusiness ? <p className="ui-meta" role="status">Directions destination: {selectedDestination}. Confirm the destination and route before travel.</p> : null}
      <div className="ui-actions">
        <a className="btn-primary" target="_blank" rel="noopener noreferrer" href={mapsSearchUrl(selectedDestination)}>Search in Google Maps <span className="sr-only">(opens in a new tab)</span></a>
        <a className="btn-secondary" target="_blank" rel="noopener noreferrer" href={mapsDirectionsUrl(selectedDestination, location ?? undefined)}>{selectedBusiness ? `Get directions to ${selectedBusiness.name}` : "Get directions"} <span className="sr-only">(opens in a new tab)</span></a>
      </div>
    </Panel>}
  </div>;
}
