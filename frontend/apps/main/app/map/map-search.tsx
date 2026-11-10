"use client";

import { useMemo, useState } from "react";
import { FilterIcon, SearchIcon } from "../../components/icons";
import { Notice, Panel, SectionHeading } from "../../components/design-system";

type Business = { slug: string; name: string; category_label: string; area: string | null; address: string | null; landmark: string | null };
const MAPS_ORIGIN = "https://www.google.com/maps/";
export function mapsSearchUrl(query: string) {
  const url = new URL("search/", MAPS_ORIGIN);
  url.searchParams.set("api", "1");
  url.searchParams.set("query", query);
  return url.toString();
}
export function mapsDirectionsUrl(destination: string, origin?: string) {
  const url = new URL("dir/", MAPS_ORIGIN);
  url.searchParams.set("api", "1");
  url.searchParams.set("destination", destination);
  if (origin) url.searchParams.set("origin", origin);
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
  const requestLocation = () => {
    if (!navigator.geolocation) { setLocationMessage("Location is not available in this browser."); return; }
    setLocationMessage("Waiting for your permission…");
    navigator.geolocation.getCurrentPosition((position) => {
      setLocation(`${position.coords.latitude},${position.coords.longitude}`);
      setLocationMessage("Location is ready for an external directions link. Google receives it only if you open that link; EPE LAWA does not store it.");
    }, () => setLocationMessage("Location was not shared. You can still search and open directions without it."), { maximumAge: 60000, timeout: 10000 });
  };
  return <div className="ui-stack">
    <Panel className="ui-card filter-panel filter-panel--map">
      <div className="filter-panel__heading"><span className="filter-panel__icon"><FilterIcon/></span><div><p className="ui-eyebrow">Map & navigation</p><h2 className="filter-panel__title">Find a place</h2></div></div>
      <form onSubmit={(event) => event.preventDefault()} className="ui-grid ui-grid--2" role="search" aria-label="Search map places">
        <div className="ui-field"><label htmlFor="map-query" className="label">Street, landmark, business or address</label><div className="filter-panel__control"><SearchIcon className="filter-panel__input-icon"/><input id="map-query" value={query} onChange={(event) => { setQuery(event.target.value.slice(0, 200)); setSelectedBusinessSlug(null); }} maxLength={200} autoComplete="off" placeholder="Search streets, landmarks or businesses" className="input w-full"/></div><p className="ui-muted">Published businesses are matched locally; other places are handed to Google Maps only when you choose.</p></div>
        <div className="ui-field ui-actions"><button type="button" className="btn-secondary" onClick={requestLocation}>Use my location</button></div>
      </form>
      <p className="ui-muted" aria-live="polite">{locationMessage}</p>
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
    <Notice tone="neutral">Google Maps search and directions are external links, not an embedded or EPE LAWA-powered Places service. If you open a directions link containing your device coordinates, Google receives those coordinates; EPE LAWA does not store them. Location is requested only after you press “Use my location”.</Notice>
  </div>;
}
