"use client";

import { useMemo, useState } from "react";

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

export default function MapSearch({ businesses }: { businesses: Business[] }) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const q = query.trim().toLocaleLowerCase();
  const matches = useMemo(() => q ? businesses.filter((b) => [b.name,b.category_label,b.area,b.address,b.landmark].filter(Boolean).join(" ").toLocaleLowerCase().includes(q)).slice(0, 10) : [], [businesses,q]);
  const requestLocation = () => {
    if (!navigator.geolocation) { setLocationMessage("Location is not available in this browser."); return; }
    setLocationMessage("Waiting for your permission…");
    navigator.geolocation.getCurrentPosition((position) => {
      setLocation(`${position.coords.latitude},${position.coords.longitude}`);
      setLocationMessage("Your device location is being used only to prepare a directions link. It is not stored by EPE LAWA.");
    }, () => setLocationMessage("Location was not shared. You can still search and open directions without it."), { maximumAge: 60000, timeout: 10000 });
  };
  const destination = query.trim();
  return <div>
    <form onSubmit={(event) => event.preventDefault()} className="card grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div><label htmlFor="map-query" className="mb-2 block font-semibold">Street, landmark, business or address</label><input id="map-query" value={query} onChange={(event) => setQuery(event.target.value.slice(0, 200))} maxLength={200} autoComplete="off" placeholder="Search streets, landmarks or businesses" className="input w-full"/><p className="mt-2 text-sm text-muted-foreground">Published businesses are matched locally; other places are handed to Google Maps when you choose.</p></div>
      <button type="button" className="btn-secondary min-h-11" onClick={requestLocation}>Use my location</button>
    </form>
    <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">{locationMessage}</p>
    {q && <section className="card mt-5 p-5" aria-live="polite" aria-labelledby="map-results-title"><p className="page-header__eyebrow">Search</p><h2 id="map-results-title" className="text-xl font-bold">{matches.length ? "Published business matches" : "No published business matches"}</h2>{matches.length ? <ul className="mt-3 divide-y">{matches.map((business) => { const address = [business.name,business.address,business.landmark,business.area].filter(Boolean).join(", "); return <li key={business.slug} className="py-3"><h3 className="font-semibold">{business.name}</h3><p className="text-sm text-muted-foreground">{[business.category_label,business.address,business.landmark,business.area].filter(Boolean).join(" · ")}</p><a className="mt-2 inline-block min-h-11 py-2 underline" target="_blank" rel="noopener noreferrer" href={mapsSearchUrl(address)}>Open business in Google Maps <span className="sr-only">(opens in a new tab)</span></a></li>; })}</ul> : <p className="mt-2 text-sm text-muted-foreground">No approved listing matched that text. Search streets and landmarks directly in Google Maps below.</p>}
      <div className="mt-4 flex flex-wrap gap-3"><a className="btn-primary" target="_blank" rel="noopener noreferrer" href={mapsSearchUrl(destination)}>Search in Google Maps <span className="sr-only">(opens in a new tab)</span></a><a className="btn-secondary" target="_blank" rel="noopener noreferrer" href={mapsDirectionsUrl(destination, location ?? undefined)}>Get directions <span className="sr-only">(opens in a new tab)</span></a></div>
    </section>}
    <aside className="mt-8 rounded-xl border border-[var(--color-sky-100)] bg-[var(--color-sky-100)]/70 p-5 text-sm leading-relaxed text-[var(--color-navy-900)]">Google Maps search and directions are outbound links, not an embedded or EPE LAWA-powered Places service. Confirm destination and route before travel. Device location is requested only after you press “Use my location”; denying it does not affect search.</aside>
  </div>;
}
