/**
 * Epe Division (owner brief, turn 26): the whole site — news, maps, the map
 * assistant and the admin AI — covers Epe Division only: Epe LGA (with the
 * Eredo and Ikosi-Ejinrin LCDAs) and Ibeju-Lekki LGA (with the Lekki LCDA).
 * Safe to import from client and server code.
 */

export const EPE_DIVISION_COUNCILS = [
  "Epe Local Government",
  "Eredo LCDA",
  "Ikosi-Ejinrin LCDA",
  "Ibeju-Lekki Local Government",
  "Lekki LCDA",
] as const;

/** West, south, east, north — the Epe Division councils from Lakowe/Awoyaya to the Lekki Lagoon and the Ogun border. */
export const EPE_DIVISION_BOUNDS = { west: 3.6, south: 6.4, east: 4.37, north: 6.76 } as const;
/** "west,south,east,north" for the OpenStreetMap embed. */
export const EPE_DIVISION_BBOX = `${EPE_DIVISION_BOUNDS.west},${EPE_DIVISION_BOUNDS.south},${EPE_DIVISION_BOUNDS.east},${EPE_DIVISION_BOUNDS.north}`;
/** Epe town, the default close-up view. */
export const EPE_TOWN_BBOX = "3.902,6.551,4.076,6.630";
export const EPE_TOWN_VIEW = "12/6.5905/3.9843";

export function insideEpeDivision(lat: number, lon: number): boolean {
  const { west, south, east, north } = EPE_DIVISION_BOUNDS;
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= south && lat <= north && lon >= west && lon <= east;
}

/** Map searches always stay in Epe Division: add the area unless the text already names a place in it. */
export function epeScopedQuery(query: string): string {
  const text = query.trim();
  if (!text) return "Epe, Lagos State, Nigeria";
  return /\b(epe|eredo|ikosi|ejinrin|ibeju|lekki|lakowe|awoyaya|eleko|akodo|bogije|itoikin|noforija|ijebu[- ]?ode)\b/i.test(text)
    ? `${text}, Lagos State, Nigeria`
    : `${text}, Epe Division, Lagos State, Nigeria`;
}
