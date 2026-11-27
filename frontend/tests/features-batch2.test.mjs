import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { businessOpenNow, hourRows, parseBusinessHours } from '../apps/main/lib/business-hours.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mainApp = (relativePath) => fs.readFileSync(path.join(root, 'frontend/apps/main', relativePath), 'utf8');
const adminApp = (relativePath) => fs.readFileSync(path.join(root, 'frontend/apps/admin', relativePath), 'utf8');

test('business hours helper validates day ranges and answers open-now in Lagos', () => {
  const hours = parseBusinessHours({ Thursday: '9:00-17:00', Friday: '25:00-26:00', someday: '09:00-17:00' });
  assert.deepEqual(hours, { thursday: '09:00–17:00' });
  assert.equal(hourRows(hours).find(row => row.day === 'friday').range, null);
  assert.equal(businessOpenNow(hours, new Date('2026-11-26T08:00:00Z')), true);
  assert.equal(businessOpenNow(hours, new Date('2026-11-26T16:00:00Z')), false);
});

test('business submit form collects opening hours and the action serialises them', () => {
  const editor = mainApp('components/business-hours-editor.tsx');
  assert.match(editor, /"use client"/);
  assert.match(editor, /type="time"/);
  assert.match(editor, /hours_json/);
  const form = mainApp('app/business-directory/submit/business-form.tsx');
  assert.match(form, /BusinessHoursEditor/);
  const actions = mainApp('app/business-directory/submit/actions.ts');
  assert.match(actions, /hours_json/);
  assert.match(actions, /parseBusinessHours/);
  // Turn 4: guest-capable direct insert (status forced to "submitted") replaced the member-only RPC.
  assert.match(actions, /hours,logo_key:logoKey,status:"submitted"/);
});

test('public business profile renders per-day hours with an open-now badge', () => {
  const page = mainApp('app/business-directory/[slug]/page.tsx');
  assert.match(page, /Open now/);
  assert.match(page, /Closed now/);
  assert.match(page, /hourRows/);
  assert.match(page, /Closed/);
});

test('staff business review shows submitted hours and can export the queue as CSV', () => {
  const page = adminApp('app/(protected)/business-review/page.tsx');
  assert.match(page, /business-hours/);
  assert.match(page, /Download CSV/);
  assert.match(page, /\/admin\/business-review\/export/);
  const route = adminApp('app/(protected)/business-review/export/route.ts');
  assert.match(route, /business\.review/);
  assert.match(route, /text\/csv/);
  assert.match(route, /Forbidden/);
});

test('members upload an avatar through a branded modal saved to profiles.avatar_key', () => {
  const storage = mainApp('lib/media-r2.ts');
  assert.match(storage, /storeAvatarDataUrl/);
  assert.match(storage, /media\/avatars/);
  const editor = mainApp('app/dashboard/avatar-editor.tsx');
  assert.match(editor, /BrandedDialog/);
  assert.match(editor, /aria-haspopup="dialog"/);
  assert.match(editor, /avatar_data/);
  const actions = mainApp('app/dashboard/actions.ts');
  assert.match(actions, /updateMemberAvatar/);
  assert.match(actions, /avatar_key/);
  const page = mainApp('app/dashboard/page.tsx');
  assert.match(page, /AvatarEditor/);
});

test('profile tab shows member since, completeness and sign out everywhere', () => {
  const page = mainApp('app/dashboard/page.tsx');
  assert.match(page, /Member since/);
  assert.match(page, /role="progressbar"/);
  assert.match(page, /signOutEverywhere/);
  assert.match(page, /Sign out everywhere/);
  const auth = mainApp('app/auth/actions.ts');
  assert.match(auth, /scope: "global"/);
  const snapshot = mainApp('lib/member-entry.ts');
  assert.match(snapshot, /avatar_key/);
  assert.match(snapshot, /created_at/);
});

test('member-facing timestamps render in Lagos time instead of server time', () => {
  const dates = mainApp('lib/dates.ts');
  assert.match(dates, /export function formatLagosDateTime/);
  for (const page of ['app/forum/page.tsx', 'app/forum/thread/[slug]/page.tsx', 'app/dashboard/page.tsx']) {
    assert.match(mainApp(page), /formatLagosDateTime/, page);
  }
});

test('the site ships an installable web manifest', () => {
  const manifest = mainApp('app/manifest.ts');
  assert.match(manifest, /display: "standalone"/);
  assert.match(manifest, /192x192/);
  assert.match(manifest, /theme_color/);
});

test('articles share only through the image share button and keep a correction entry point', () => {
  const article = mainApp('app/news/[slug]/page.tsx');
  // Turn 15 owner brief: the share button that attaches the cover image is the only share option.
  assert.doesNotMatch(article, /twitter\.com\/intent|wa\.me\/|facebook\.com\/sharer/);
  assert.match(article, /<ArticleShareActions title=\{article\.title\} imageUrl=\{imageUrl\}/);
  assert.match(mainApp('components/article-share-actions.tsx'), /files: \[cover\]/);
  // Turn 4: the correction form is open to everyone (guests leave a name and email).
  assert.match(article, /<CorrectionForm articleId=\{article\.id\}/);
  assert.match(mainApp('components/correction-form.tsx'), /Suggest a correction/);
});

test('article pages print clean: chrome hidden, story readable', () => {
  const newsCss = mainApp('app/news/news.module.css');
  assert.match(newsCss, /@media print/);
  assert.match(newsCss, /\.shareLinks, \.articleExtras/);
  const globals = mainApp('app/globals.css');
  assert.match(globals, /@media print/);
  assert.match(globals, /\.site-head, \.site-footer/);
});

test('sitemap stamps /news with the latest published story date', () => {
  const sitemap = mainApp('app/sitemap.ts');
  assert.match(sitemap, /published_articles/);
  assert.match(sitemap, /lastModified/);
  assert.match(sitemap, /isIndexingAllowed/);
});
