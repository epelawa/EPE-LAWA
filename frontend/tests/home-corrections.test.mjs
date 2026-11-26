import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('public placements and the incomplete language switch are not mounted', async () => {
  for (const file of ['app/page.tsx', 'app/layout.tsx', 'app/radio/page.tsx', 'app/dashboard/news-content.tsx']) {
    assert.doesNotMatch(await read(`frontend/apps/main/${file}`), /<Sponsor(?:Slot|PopupPlacement)/);
  }
  assert.doesNotMatch(await read('frontend/apps/main/components/news-footer.tsx'), /<LangToggle/);
  assert.match(await read('frontend/apps/main/app/page.tsx'), /src="\/brand-logo\.webp"/);
});

test('hero rotation has no pause button and retains motion safeguards', async () => {
  const carousel = await read('frontend/apps/main/components/hero-carousel.tsx');
  const css = await read('frontend/apps/main/app/hero-logo.css');
  assert.doesNotMatch(carousel, /Pause photos|Play photos|home-hero__rotation|setPaused/);
  assert.doesNotMatch(css, /home-hero__rotation/);
  assert.match(carousel, /ROTATION_DELAY_MS/);
  assert.match(carousel, /focused \|\| hovered \|\| !pageVisible \|\| reducedMotion/);
});

test('support enters the private queue and staff can reply with its reference', async () => {
  const action = await read('frontend/apps/main/app/enquiry/actions.ts');
  const admin = await read('frontend/apps/admin/app/(protected)/enquiries/page.tsx');
  assert.match(action, /private_enquiry_submit/);
  assert.match(action, /\[Support request\]/);
  assert.match(admin, /staff_enquiry_list/);
  assert.match(admin, /mailto:/);
  assert.match(admin, /row\.id/);
});

test('follow notifications satisfy the table contract and respect news preference', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table public.articles (id text, slug text, published_at timestamptz, published_version_id text);
      create table public.article_versions (id text, title text, category_id text);
      create table public.topic_follows (user_id text, topic_type text, topic_id text);
      create table public.notification_preferences (user_id text, in_app_news boolean);
      create table public.notifications (user_id text, kind text check (kind = 'news_published'), title text check (length(title) <= 140), body text not null, url text, resource_type text, resource_id text);
    `);
    await db.exec(await read('backend/supabase/migrations/20261126103500_repair_follow_article_notifications.sql'));
    await db.exec(`create trigger notify after update of published_at on public.articles for each row execute function public.notify_followers_article_published();
      insert into public.article_versions values ('v', repeat('x', 200), 'category');
      insert into public.articles values ('a', 'story', null, 'v');
      insert into public.topic_follows values ('yes', 'news_category', 'category'), ('no', 'news_category', 'category');
      insert into public.notification_preferences values ('no', false);
      update public.articles set published_at = now() where id = 'a';`);
    const result = await db.query('select user_id, kind, title, body, url from public.notifications');
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].user_id, 'yes');
    assert.equal(result.rows[0].kind, 'news_published');
    assert.equal(result.rows[0].title.length, 140);
    assert.ok(result.rows[0].body);
    assert.equal(result.rows[0].url, '/news/story');
  } finally { await db.close(); }
});

test('future newsroom push reads the published version, not missing article columns', async () => {
  const actions = await read('frontend/apps/admin/lib/actions.ts');
  assert.match(actions, /from\("published_articles"\)\.select\("title,summary,slug"\)/);
});
