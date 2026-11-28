import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ui = await readFile(new URL('../apps/main/app/map/map-search.tsx', import.meta.url), 'utf8');
const page = await readFile(new URL('../apps/main/app/map/page.tsx', import.meta.url), 'utf8');
const contributePage = await readFile(new URL('../apps/main/app/map/contribute/page.tsx', import.meta.url), 'utf8');
const assistant = await readFile(new URL('../apps/main/app/map/map-assistant.tsx', import.meta.url), 'utf8');
const assistantCss = await readFile(new URL('../apps/main/app/map/map-assistant.module.css', import.meta.url), 'utf8');
const footer = await readFile(new URL('../apps/main/components/site-footer.tsx', import.meta.url), 'utf8');
const csp = await readFile(new URL('../apps/main/lib/csp.ts', import.meta.url), 'utf8');
const ai = await readFile(new URL('../apps/main/lib/ai/map-assistant.ts', import.meta.url), 'utf8');
const correctionApi = await readFile(new URL('../apps/main/app/api/map/corrections/route.ts', import.meta.url), 'utf8');

test('the find-your-way page is the assistant chat, with a greeting screen like the owner reference', () => {
  assert.match(page, /export default function MapPage\(\)/);
  assert.match(page, /return <MapAssistant \/>;/);
  assert.doesNotMatch(page, /MapSearch|PageFrame|businesses/);
  assert.match(assistant, /<section className=\{`\$\{styles\.root\} page-full-bleed`\}/);
  assert.match(assistant, /How can I help you today\?<\/h1>/);
  assert.match(assistant, /<BrainWaveMark \/>/);
  assert.match(assistant, /<form className=\{styles\.form\} onSubmit=\{submit\}/);
});

test('no suggestions and no correction form interrupt the chat; they live on /map/contribute', () => {
  assert.doesNotMatch(assistant, /SUGGESTIONS|suggested questions|map-corrections/);
  assert.match(assistant, /href="\/map\/contribute"/);
  assert.match(contributePage, /from\("published_businesses"\)\.select\("slug,name,category_label,area,address,landmark"\)/);
  assert.match(ui, /id="map-corrections"/);
});

test('no map iframe is requested on arrival; frames render only under assistant place replies', () => {
  const frameCount = (assistant.match(/<iframe/g) ?? []).length;
  assert.equal(frameCount, 1);
  assert.ok(assistant.indexOf('turn.role === "assistant" && !turn.offTopic && turn.places?.length') < assistant.indexOf('<iframe'));
  assert.doesNotMatch(page, /<iframe/);
});

test('assistant answers pinpoint the destination on Google Maps below the message', () => {
  assert.match(assistant, /https:\/\/www\.google\.com\/maps/);
  assert.match(assistant, /url\.searchParams\.set\("output", "embed"\)/);
  assert.match(assistant, /url\.searchParams\.set\("q", coordinate\(place\) \?\? epeScopedQuery\(place\.query\)\)/);
  assert.match(assistant, /Google Maps preview for \$\{place\.name\}/);
  assert.match(assistant, /Human-verified EPE LAWA location/);
  assert.match(assistant, /Open pinned directions in Google Maps/);
  assert.match(assistant, /url\.searchParams\.set\("destination", coordinate\(place\) \?\? epeScopedQuery\(place\.query\)\)/);
  assert.doesNotMatch(assistant, /openstreetmap\.org\/export|OpenStreetMap preview/);
});

test('the content security policy frames Google Maps and no longer OpenStreetMap on the public app', () => {
  assert.match(csp, /frame-src https:\/\/www\.google\.com https:\/\/maps\.google\.com/);
  assert.doesNotMatch(csp, /openstreetmap\.org/);
});

test('the site footer stays off the chat page and elsewhere unchanged', () => {
  assert.match(footer, /pathname === "\/map"/);
});

test('the manual tools page keeps location click-only, local to this tab, and never sent to EPE LAWA', () => {
  assert.match(ui, /onClick=\{requestLocation\}/);
  assert.match(ui, /const requestLocation = \(\) => \{\s*setLocation\(null\);\s*setMapVisible\(true\);[\s\S]*?navigator\.geolocation\.getCurrentPosition/);
  assert.equal((ui.match(/navigator\.geolocation\.getCurrentPosition/g) ?? []).length, 1);
  assert.match(ui, /if \(!window\.isSecureContext\)/);
  assert.match(ui, /error\.PERMISSION_DENIED/);
  assert.match(ui, /error\.TIMEOUT/);
  assert.match(ui, /You can still search manually/);
  assert.doesNotMatch(ui, /localStorage|sessionStorage|navigator\.geolocation\.watchPosition/);
  assert.match(ui, /setLocation\(`\$\{position\.coords\.latitude\},\$\{position\.coords\.longitude\}`\)/);
  assert.doesNotMatch(contributePage, /navigator\.geolocation|service_role|SUPABASE_SERVICE/);
});

test('the manual map preview still needs an explicit interaction and now embeds Google Maps', () => {
  assert.match(ui, /const \[mapVisible, setMapVisible\] = useState\(false\)/);
  assert.match(ui, /\{mapVisible \? <Panel[\s\S]*?<iframe\s+title="Epe Division map on Google Maps"[\s\S]*?: <p className="ui-muted">The map preview stays closed/);
  assert.match(ui, /Search and show map/);
  assert.match(ui, /googleEmbedUrl\(/);
  assert.doesNotMatch(ui, /osmEmbedUrl|osmSearchUrl|export\/embed\.html/);
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

test('a selected published business becomes the manual directions destination', () => {
  assert.match(ui, /selectedBusinessSlug/);
  assert.match(ui, /aria-pressed=\{selected\}/);
  assert.match(ui, /setSelectedBusinessSlug\(business\.slug\)/);
  assert.match(ui, /setDestination\(address\)/);
  assert.match(ui, /Get directions to \$\{selectedBusiness\.name\}/);
  assert.match(ui, /setSelectedBusinessSlug\(null\)/);
});

test('published business data remains minimal and bounded', () => {
  assert.match(contributePage, /from\("published_businesses"\)\.select\("slug,name,category_label,area,address,landmark"\)/);
  assert.match(contributePage, /\.limit\(100\)/);
  assert.doesNotMatch(contributePage, /places\.googleapis|maps\.googleapis|NEXT_PUBLIC_.*MAP|GOOGLE_MAPS_API_KEY/);
  assert.match(contributePage, /let businessError = false/);
  assert.match(contributePage, /businessError = true/);
});

test('business query errors are distinct from true no-match results', () => {
  assert.match(ui, /Local business data unavailable/);
  assert.match(ui, /manual street and landmark search remains available/);
});

test('assistant ignores model coordinates and attaches only bounded verified evidence', () => {
  assert.match(ai, /from\("map_verified_knowledge"\)\.select\("place_name,details,directions_query,latitude,longitude,source_note"\)\.eq\("status", "active"\)/);
  assert.match(ai, /from\("tourism_destinations"\)\.select\([^\n]*latitude,longitude/);
  assert.match(ai, /Deliberately ignore all model-supplied coordinates and pin metadata/);
  assert.match(ai, /insideEpeDivision\(latitude, longitude\)/);
  assert.match(ai, /pinSource: match\.source/);
  // Pending correction submissions are intentionally absent from AI retrieval.
  assert.doesNotMatch(ai, /from\("map_correction_submissions"\)/);
  assert.doesNotMatch(ai, /places\.googleapis|maps\.googleapis|GOOGLE_MAPS_API_KEY/);
});

test('voice input stays honest about being unavailable', () => {
  assert.match(assistant, /Voice input is not available yet/);
  assert.match(assistant, /aria-label="Voice input is not available yet; use typing instead"/);
});

test('reduced-motion disables the orb, halo and trace animations', () => {
  assert.match(assistantCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(assistantCss, /\.orbGlow, \.orbGlow::before, \.waveTrace, \.thinking i \{ animation: none; \}/);
});

test('visitor corrections are private, rate-limited, size-limited, and pending-only until review', () => {
  assert.match(ui, /Submit private correction/);
  assert.match(ui, /private and will be checked by a human/);
  assert.match(ui, /<HumanCheck resetOn=\{humanRound\} \/>/);
  assert.match(ui, /hc_token: data\.get\("hc-token"\)/);
  assert.match(ui, /fetch\("\/api\/map\/corrections"/);
  assert.match(correctionApi, /origin !== new URL\(request\.url\)\.origin/);
  assert.match(correctionApi, /MAX_BYTES = 8 \* 1024/);
  assert.ok(correctionApi.indexOf("verifyHumanCheck(humanForm)") < correctionApi.indexOf("formRateAllowance(\"map_correction\""));
  assert.match(correctionApi, /formRateAllowance\("map_correction", RATE_LIMIT\)/);
  assert.match(correctionApi, /insert\(\{ \.\.\.correction, status: "pending" \}\)/);
  assert.match(correctionApi, /protocol !== "https:"/);
  assert.doesNotMatch(correctionApi, /latitude|longitude|coordinates|auth\.uid/);
});
