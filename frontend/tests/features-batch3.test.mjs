import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mainApp = (relativePath) => fs.readFileSync(path.join(root, 'frontend/apps/main', relativePath), 'utf8');
const adminApp = (relativePath) => fs.readFileSync(path.join(root, 'frontend/apps/admin', relativePath), 'utf8');
const repo = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('site identity is centralised as Epe Lawa with the shared contact inbox', () => {
  const identity = mainApp('lib/site-identity.ts');
  assert.match(identity, /SITE_AUTHOR = "Epe Lawa"/);
  assert.match(identity, /CONTACT_EMAIL = "info\.epelawa@gmail\.com"/);
});

test('RSS feed and calendar exports identify Epe Lawa as the responsible sender', () => {
  const feed = mainApp('app/feed.xml/route.ts');
  assert.match(feed, /site-identity/);
  assert.match(feed, /managingEditor/);
  assert.match(feed, /webMaster/);
  const ics = mainApp('app/radio/programmes/ics.ts');
  assert.match(ics, /site-identity/);
  assert.match(ics, /ORGANIZER/);
  assert.match(ics, /mailto/);
});

test('mail identities document the Epe Lawa sender envelope', () => {
  const env = repo('.env.example');
  assert.match(env, /^AUTH_EMAIL_FROM=Epe Lawa <info\.epelawa@gmail\.com>$/m);
  assert.match(env, /^NEWSLETTER_FROM=Epe Lawa <info\.epelawa@gmail\.com>$/m);
  assert.match(env, /^AUTH_GMAIL_USER=info\.epelawa@gmail\.com$/m);
});

test('correction reports have a forward-only migration with member RPC, staff RPC and review-gated reads', () => {
  const migration = repo('backend/supabase/migrations/20261123010000_article_correction_reports.sql');
  assert.match(migration, /create table if not exists public\.article_correction_reports/);
  assert.match(migration, /member_file_correction/);
  assert.match(migration, /staff_resolve_correction/);
  assert.match(migration, /correction_reports_staff_read/);
  assert.match(migration, /article\.review/);
  assert.match(migration, /security definer/);
  assert.match(migration, /audit_event/);
});

test('members file corrections through a rate-gated server action', () => {
  const actions = mainApp('app/news/[slug]/correction-actions.ts');
  assert.match(actions, /"use server"/);
  assert.match(actions, /member_file_correction/);
  assert.match(actions, /formRateAllowance\("article_correction"\)/);
  const form = mainApp('components/correction-form.tsx');
  assert.match(form, /BrandedDialog/);
  assert.match(form, /aria-haspopup/);
  const articlePage = mainApp('app/news/[slug]/page.tsx');
  assert.match(articlePage, /CorrectionForm/);
  assert.match(articlePage, /site-identity/);
});

test('staff review corrections behind the article.review capability', () => {
  const page = adminApp('app/(protected)/corrections/page.tsx');
  assert.match(page, /article\.review/);
  assert.match(page, /article_correction_reports/);
  assert.match(page, /resolveCorrection/);
  assert.match(page, /\/news\/\$\{/);
  assert.match(page, /Recently handled/);
  const actions = adminApp('app/(protected)/corrections/actions.ts');
  assert.match(actions, /"use server"/);
  assert.match(actions, /staff_resolve_correction/);
  assert.match(actions, /has_capability/);
  const nav = adminApp('lib/navigation.ts');
  assert.match(nav, /\/corrections/);
});

test('staff can add opening hours when creating a listing directly', () => {
  const form = adminApp('components/business-create-form.tsx');
  assert.match(form, /BusinessHoursEditor/);
  const actions = adminApp('app/(protected)/business-review/actions.ts');
  assert.match(actions, /hours_json/);
  assert.match(actions, /parseBusinessHours/);
  assert.match(actions, /p_hours: hours/);
});

test('forum posts show the author avatar when one exists', () => {
  const thread = mainApp('app/forum/thread/[slug]/page.tsx');
  assert.match(thread, /avatar_key/);
  assert.match(thread, /publicMediaUrl/);
  assert.match(thread, /postAvatar/);
  const css = mainApp('app/forum/forum.module.css');
  assert.match(css, /\.postAvatar/);
});
