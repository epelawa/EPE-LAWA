import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readProjectFile = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const mainApp = (relativePath) => readProjectFile(path.join('frontend/apps/main', relativePath));

// Owner brief (turn 3): the standalone /search page is replaced by the header search dialog.
// The same five public collections are still searched, now through /api/search.
test('site-wide search queries every public collection through the search API and dialog', () => {
  const search = mainApp('lib/site-search.ts');
  assert.match(search, /published_articles/);
  assert.match(search, /business_discovery_search/);
  assert.match(search, /tourism_destinations/);
  assert.match(search, /published_people/);
  assert.match(search, /forum_threads/);
  assert.match(search, /import "server-only"/);
  const api = mainApp('app/api/search/route.ts');
  assert.match(api, /searchSite/);
  const dialog = mainApp('components/site-search.tsx');
  assert.match(dialog, /fetch\(`\/api\/search\?/);
  assert.match(dialog, /Search EPE LAWA/);
  assert.match(dialog, /What are you looking for\?/);
  assert.throws(() => mainApp('app/search/page.tsx'), /ENOENT/, 'the /search page is retired');
  const legacy = mainApp('app/search/route.ts');
  assert.match(legacy, /new URLSearchParams\(\{ open: "search" \}\)/, 'old /search links redirect to the dialog');
  assert.match(legacy, /status: 308/);
});

test('RSS feed route publishes an RSS 2.0 document from published_articles', () => {
  const feed = mainApp('app/feed.xml/route.ts');
  assert.match(feed, /<rss version="2\.0"/);
  assert.match(feed, /published_articles/);
  assert.match(feed, /escapeXml/);
  assert.match(feed, /isIndexingAllowed/);
  const layout = mainApp('app/layout.tsx');
  assert.match(layout, /"application\/rss\+xml": "\/feed\.xml"/);
  const llms = mainApp('app/llms.txt/route.ts');
  assert.match(llms, /\/feed\.xml/);
});

test('forum listing supports sort param with pinned threads first', () => {
  const page = mainApp('app/forum/page.tsx');
  assert.match(page, /is_pinned/);
  assert.match(page, /order\("is_pinned", \{ ascending: false \}\)/);
  assert.match(page, /order\("created_at", \{ ascending: false \}\)/);
  assert.match(page, /order\("post_count", \{ ascending: false \}\)/);
  assert.match(page, /sortHref/);
  const css = mainApp('app/forum/forum.module.css');
  assert.match(css, /\.sortLink/);
  assert.match(css, /\.pinnedBadge/);
});

test('tourism detail page lists more destinations', () => {
  const page = mainApp('app/tourism/[slug]/page.tsx');
  assert.match(page, /More destinations/);
  assert.match(page, /neq\("id", item\.id\)/);
});

test('404 page suggests popular sections and site search', () => {
  const page = mainApp('app/not-found.tsx');
  assert.match(page, /<OpenSearchButton \/>/);
  assert.match(page, /Popular sections/i);
  assert.match(page, /\/business-directory/);
  assert.match(page, /\/tourism/);
  assert.match(page, /\/who-is-who/);
});

test('radio programmes highlight the on-air slot and offer an .ics export', () => {
  const onAir = mainApp('app/radio/programmes/on-air.ts');
  assert.match(onAir, /Africa\/Lagos/);
  assert.match(onAir, /export function onAirSlotId/);
  const page = mainApp('app/radio/programmes/page.tsx');
  assert.match(page, /onAirSlotId/);
  assert.match(page, /On air now/);
  assert.match(page, /\/api\/radio\/schedule\.ics/);
  const route = mainApp('app/api/radio/schedule.ics/route.ts');
  assert.match(route, /text\/calendar/);
  const ics = mainApp('app/radio/programmes/ics.ts');
  assert.match(ics, /RRULE:FREQ=WEEKLY/);
  assert.match(ics, /X-WR-TIMEZONE:Africa\/Lagos/);
});

test('gallery grid opens a branded lightbox with keyboard navigation', () => {
  const grid = mainApp('app/gallery/lightbox-grid.tsx');
  assert.match(grid, /"use client"/);
  assert.match(grid, /BrandedDialog/);
  assert.match(grid, /ArrowRight/);
  assert.match(grid, /ArrowLeft/);
  const page = mainApp('app/gallery/page.tsx');
  assert.match(page, /GalleryLightboxGrid/);
  const css = mainApp('app/gallery/gallery.module.css');
  assert.match(css, /\.lightboxTrigger/);
});

test('slash key focuses page search via a global listener', () => {
  const component = mainApp('components/slash-focus.tsx');
  assert.match(component, /"use client"/);
  assert.match(component, /data-slash-focus/);
  assert.match(component, /openSiteSearch\(\)/, 'pages without their own field open the search dialog');
  const layout = mainApp('app/layout.tsx');
  assert.match(layout, /SlashFocus/);
  const directory = mainApp('app/business-directory/page.tsx');
  assert.match(directory, /data-slash-focus/);
  const news = mainApp('app/news/page.tsx');
  assert.match(news, /data-slash-focus/);
});
