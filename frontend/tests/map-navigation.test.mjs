import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ui = await readFile(new URL('../apps/main/app/map/map-search.tsx', import.meta.url), 'utf8');
const page = await readFile(new URL('../apps/main/app/map/page.tsx', import.meta.url), 'utf8');

test('device location is click-only, clears stale coordinates, and reports outcomes without sending it to the server', () => {
  assert.match(ui, /onClick=\{requestLocation\}/);
  assert.match(ui, /const requestLocation = \(\) => \{\s*setLocation\(null\);[\s\S]*?navigator\.geolocation\.getCurrentPosition/);
  assert.equal((ui.match(/navigator\.geolocation\.getCurrentPosition/g) ?? []).length, 1);
  assert.match(ui, /if \(!window\.isSecureContext\)/);
  assert.match(ui, /error\.PERMISSION_DENIED/);
  assert.match(ui, /error\.TIMEOUT/);
  assert.match(ui, /Your location is unavailable/);
  assert.match(ui, /You can still search manually/);
  assert.doesNotMatch(ui, /useEffect|localStorage|sessionStorage|fetch\(|navigator\.geolocation\.watchPosition/);
  assert.match(ui, /setLocation\(`\$\{position\.coords\.latitude\},\$\{position\.coords\.longitude\}`\)/);
  assert.match(page, /published_businesses/);
  assert.doesNotMatch(page, /navigator\.geolocation|service_role|SUPABASE_SERVICE/);
});

test('outbound Maps links use a fixed HTTPS Google Maps origin and URLSearchParams encoding', () => {
  assert.match(ui, /const MAPS_ORIGIN = "https:\/\/www\.google\.com\/maps\/"/);
  assert.match(ui, /new URL\("search\/", MAPS_ORIGIN\)/);
  assert.match(ui, /url\.searchParams\.set\("query", query\)/);
  assert.match(ui, /url\.searchParams\.set\("destination", destination\)/);
  assert.match(ui, /target="_blank" rel="noopener noreferrer"/);
  assert.doesNotMatch(ui, /href=\{\s*(query|destination|location)/);
});

test('business map read model contains only published listing fields and is bounded', () => {
  assert.match(page, /from\("published_businesses"\)\.select\("slug,name,category_label,area,address,landmark"\)/);
  assert.match(page, /\.limit\(100\)/);
  assert.doesNotMatch(page, /places\.googleapis|maps\.googleapis|NEXT_PUBLIC_.*MAP|GOOGLE_MAPS_API_KEY/);
});

test('a selected published business becomes the directions destination', () => {
  assert.match(ui, /selectedBusinessSlug/);
  assert.match(ui, /aria-pressed=\{selected\}/);
  assert.match(ui, /setSelectedBusinessSlug\(business\.slug\)/);
  assert.match(ui, /mapsDirectionsUrl\(selectedDestination, location \?\? undefined\)/);
  assert.match(ui, /Get directions to \$\{selectedBusiness\.name\}/);
  assert.match(ui, /setSelectedBusinessSlug\(null\)/);
});

test('business query errors are distinct from true no-match results', () => {
  assert.match(page, /let businessError = false/);
  assert.match(page, /businessError = true/);
  assert.match(page, /businesses=\{businesses\} businessError=\{businessError\}/);
  assert.match(ui, /Local business data unavailable/);
  assert.match(ui, /manual street and landmark search/);
});

test('location disclosure says Google receives coordinates only when an external link is opened', () => {
  assert.match(ui, /Google receives them only if you continue into Google Maps/);
  assert.match(ui, /Your device location is shared with Google only if you open directions while location sharing is enabled/);
  assert.match(ui, /Search and directions on Google Maps are provided by an external service/);
  assert.match(ui, /EPE LAWA does not store your coordinates/);
});

test('the map panel embeds OpenStreetMap without any API key and keeps coordinates local', () => {
  assert.match(ui, /const OSM_ORIGIN = "https:\/\/www\.openstreetmap\.org\/"/);
  assert.match(ui, /new URL\("export\/embed\.html", OSM_ORIGIN\)/);
  assert.match(ui, /url\.searchParams\.set\("layer", "mapnik"\)/);
  assert.match(ui, /<iframe\s+title="Epe community map"\s+src=\{embedUrl\}\s+loading="lazy"/);
  assert.doesNotMatch(ui, /yandex|mapbox|thunderforest|api_key|apiKey|API_KEY/);
  assert.match(ui, /OpenStreetMap contributors/);
  assert.match(ui, /your coordinates stay in this browser tab/);
  assert.match(ui, /Directions in Google Maps are opened only when you choose|Google Maps is opened only when you choose to get directions there/);
  assert.doesNotMatch(ui, /next\/script|useEffect\(\(\) => .*geolocation/);
});
