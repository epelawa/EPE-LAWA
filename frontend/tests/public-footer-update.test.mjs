import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = (path) => readFile(new URL(`../apps/main/${path}`, import.meta.url), 'utf8');

test('shared public footer and active signup render consistently across home, News, article and radio routes', async () => {
  const [footer, layout, navigation, home, advertise, listing, article, radio] = await Promise.all(['components/news-footer.tsx','app/layout.tsx','lib/navigation.ts','app/page.tsx','app/advertise/page.tsx','app/news/page.tsx','app/news/[slug]/page.tsx','app/radio/reminders/page.tsx'].map(read));
  for (const href of ['/news','/radio','/itan-ilu-mi','/forum','/who-is-who','/map','/business-directory','/tourism','/advertise']) assert.ok(navigation.includes(`href: "${href}"`), href);
  for (const href of ['/about','/contact','/photo-credits','/privacy','/terms']) assert.ok(footer.includes(`href="${href}"`), href);
  assert.match(layout, /<NewsFooter listing\s*\/>/);
  assert.match(footer, /<NewsletterForm id="news-listing-signup"/);
  assert.match(footer, /A thoughtful roundup of local reporting, community stories/);
  assert.doesNotMatch(footer, /sign-up is paused|NewsletterUnavailable/);
  assert.doesNotMatch(home + advertise + listing + article + radio, /<NewsFooter/);
});

test('error page includes accessible retry and decorative artwork with reduced motion support', async () => {
  const page = await read('app/error.tsx');
  const styles = await read('app/page-error.module.css');
  assert.match(page, /aria-hidden="true"/);
  assert.match(page, /onClick=\{\(\) => reset\(\)\}/);
  assert.match(styles, /prefers-reduced-motion:no-preference/);
});
