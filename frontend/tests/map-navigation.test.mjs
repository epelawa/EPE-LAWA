import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ui = await readFile(new URL('../apps/main/app/map/map-search.tsx', import.meta.url), 'utf8');
const page = await readFile(new URL('../apps/main/app/map/page.tsx', import.meta.url), 'utf8');
const assistant = await readFile(new URL('../apps/main/app/map/map-assistant.tsx', import.meta.url), 'utf8');
const assistantCss = await readFile(new URL('../apps/main/app/map/map-assistant.module.css', import.meta.url), 'utf8');
const ai = await readFile(new URL('../apps/main/lib/ai/map-assistant.ts', import.meta.url), 'utf8');
const correctionApi = await readFile(new URL('../apps/main/app/api/map/corrections/route.ts', import.meta.url), 'utf8');


test('the inline AI directions chat is the first page experience and uses the page h1', () => {
  assert.ok(page.indexOf('<MapAssistant />') < page.indexOf('<MapSearch'));
  assert.doesNotMatch(page, /<PageIntro/);
  assert.match(assistant, /<section className=\{styles\.root\}/);
  assert.match(assistant, /<h1 id="map-assistant-title">Where are you headed\?<\/h1>/);
  assert.match(assistant, /<form className=\{styles\.form\} onSubmit=\{submit\}/);
});

test('no map iframe is requested on arrival; manual preview requires an explicit interaction', () => {
  assert.match(ui, /const \[mapVisible, setMapVisible\] = useState\(false\)/);
  assert.match(ui, /setMapVisible\(true\)/);
  assert.match(ui, /\{mapVisible \? <Panel[\s\S]*?<iframe\s+title="Epe Division map"[\s\S]*?: <p className="ui-muted">The map preview stays closed/);
  assert.match(ui, /Search and show map/);
  assert.match(ui, /onClick=\{requestLocation\}/);
});

test('assistant route previews appear only beneath assistant place replies and are labelled', () => {
  assert.match(assistant, /turn\.role === "assistant" && !turn\.offTopic && turn\.places\?\.length/);
  assert.match(assistant, /<iframe title=\{`OpenStreetMap preview for \$\{place\.name\}`\} src=\{mapPreviewHref\(place\)\}/);
  assert.match(assistant, /Human-verified EPE LAWA location/);
  assert.match(assistant, /OpenStreetMap search pin · not staff-verified/);
  assert.match(assistant, /No verified pin available · map shows Epe Division/);
  assert.match(assistant, /Open pinned directions in Google Maps/);
  assert.match(assistant, /url\.searchParams\.set\("destination", coordinate\(place\) \?\? epeScopedQuery\(place\.query\)\)/);
});

test('reduced-motion disables the brain-wave animation and chat motion', () => {
  assert.match(assistant, /className=\{styles\.brainWave\}/);
  assert.match(assistantCss, /\.waveTrace[^\n]*animation: traceFlow/);
  assert.match(assistantCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(assistantCss, /\.brainOutline, \.brainDivider, \.waveTrace[\s\S]*?animation: none/);
});

test('device location is click-only, local to this tab, and never sent to EPE LAWA', () => {
  assert.match(ui, /onClick=\{requestLocation\}/);
  assert.match(ui, /const requestLocation = \(\) => \{\s*setLocation\(null\);\s*setMapVisible\(true\);[\s\S]*?navigator\.geolocation\.getCurrentPosition/);
  assert.equal((ui.match(/navigator\.geolocation\.getCurrentPosition/g) ?? []).length, 1);
  assert.match(ui, /if \(!window\.isSecureContext\)/);
  assert.match(ui, /error\.PERMISSION_DENIED/);
  assert.match(ui, /error\.TIMEOUT/);
  assert.match(ui, /You can still search manually/);
  assert.doesNotMatch(ui, /localStorage|sessionStorage|navigator\.geolocation\.watchPosition/);
  assert.match(ui, /setLocation\(`\$\{position\.coords\.latitude\},\$\{position\.coords\.longitude\}`\)/);
  assert.match(page, /published_businesses/);
  assert.doesNotMatch(page, /navigator\.geolocation|service_role|SUPABASE_SERVICE/);
});

test('Google Maps outbound links use a fixed HTTPS origin and encoded scoped locations', () => {
  assert.match(ui, /const MAPS_ORIGIN = "https:\/\/www\.google\.com\/maps\/"/);
  assert.match(ui, /new URL\("search\/", MAPS_ORIGIN\)/);
  assert.match(ui, /new URL\("dir\/", MAPS_ORIGIN\)/);
  assert.match(ui, /url\.searchParams\.set\("query", epeScopedQuery\(query\)\)/);
  assert.match(ui, /url\.searchParams\.set\("destination", epeScopedQuery\(destination\)\)/);
  assert.match(ui, /target="_blank" rel="noopener noreferrer"/);
  assert.doesNotMatch(ui, /href=\{\s*(query|destination|location)/);
});

test('manual directions accept a visitor-entered origin and destination without sending them to EPE LAWA', () => {
  assert.match(ui, /id="map-origin"/);
  assert.match(ui, /id="map-destination"/);
  assert.match(ui, /mapsDirectionsUrl\(destination\.trim\(\), location \|\| origin\.trim\(\) \|\| undefined\)/);
  assert.match(ui, /Open directions in Google Maps/);
  assert.doesNotMatch(correctionApi, /\b(?:destination|location|latitude|longitude)\b/i);
});

test('published business data remains minimal and bounded', () => {
  assert.match(page, /from\("published_businesses"\)\.select\("slug,name,category_label,area,address,landmark"\)/);
  assert.match(page, /\.limit\(100\)/);
  assert.doesNotMatch(page, /places\.googleapis|maps\.googleapis|NEXT_PUBLIC_.*MAP|GOOGLE_MAPS_API_KEY/);
});

test('a selected published business becomes the manual directions destination', () => {
  assert.match(ui, /selectedBusinessSlug/);
  assert.match(ui, /aria-pressed=\{selected\}/);
  assert.match(ui, /setSelectedBusinessSlug\(business\.slug\)/);
  assert.match(ui, /setDestination\(address\)/);
  assert.match(ui, /Get directions to \$\{selectedBusiness\.name\}/);
  assert.match(ui, /setSelectedBusinessSlug\(null\)/);
});

test('business query errors are distinct from true no-match results', () => {
  assert.match(page, /let businessError = false/);
  assert.match(page, /businessError = true/);
  assert.match(page, /businesses=\{businesses\} businessError=\{businessError\}/);
  assert.match(ui, /Local business data unavailable/);
  assert.match(ui, /manual street and landmark search remains available/);
});

test('assistant ignores model coordinates and attaches only bounded verified or OSM evidence', () => {
  assert.match(ai, /from\("map_verified_knowledge"\)\.select\("place_name,details,directions_query,latitude,longitude,source_note"\)\.eq\("status", "active"\)/);
  assert.match(ai, /from\("tourism_destinations"\)\.select\([^\n]*latitude,longitude/);
  assert.match(ai, /Deliberately ignore all model-supplied coordinates and pin metadata/);
  assert.match(ai, /insideEpeDivision\(latitude, longitude\)/);
  assert.match(ai, /pinSource: match\.source/);
  assert.match(ai, /bounded"\, "1"/);
  // Pending correction submissions are intentionally absent from AI retrieval.
  assert.doesNotMatch(ai, /from\("map_correction_submissions"\)/);
  assert.doesNotMatch(ai, /places\.googleapis|maps\.googleapis|GOOGLE_MAPS_API_KEY/);
});

test('visitor corrections are private, rate-limited, size-limited, and pending-only until review', () => {
  assert.match(ui, /id="map-corrections"/);
  assert.match(ui, /Submit private correction/);
  assert.match(ui, /private and will be checked by a human/);
  assert.match(ui, /fetch\("\/api\/map\/corrections"/);
  assert.match(correctionApi, /origin !== new URL\(request\.url\)\.origin/);
  assert.match(correctionApi, /MAX_BYTES = 8 \* 1024/);
  assert.match(correctionApi, /formRateAllowance\("map_correction", RATE_LIMIT\)/);
  assert.match(correctionApi, /insert\(\{ \.\.\.correction, status: "pending" \}\)/);
  assert.match(correctionApi, /protocol !== "https:"/);
  assert.doesNotMatch(correctionApi, /latitude|longitude|coordinates|auth\.uid/);
});
