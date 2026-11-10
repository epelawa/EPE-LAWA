import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ui = await readFile(new URL('../apps/main/app/map/map-search.tsx', import.meta.url), 'utf8');
const page = await readFile(new URL('../apps/main/app/map/page.tsx', import.meta.url), 'utf8');

test('device location is opt-in and is not persisted or sent to the server', () => {
  assert.match(ui, /onClick=\{requestLocation\}/);
  assert.match(ui, /navigator\.geolocation\.getCurrentPosition/);
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
  assert.match(ui, /Google receives it only if you open that link/);
  assert.match(ui, /Google receives those coordinates/);
  assert.match(ui, /EPE LAWA does not store them/);
});
