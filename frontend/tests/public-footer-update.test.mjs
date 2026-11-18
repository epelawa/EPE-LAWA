import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = (path) => readFile(new URL(`../apps/main/${path}`, import.meta.url), 'utf8');

test('standard footer contains all drawer destinations and active signup; editorial routes retain their own footer', async () => {
  const [footer, navigation, home, advertise, listing, article] = await Promise.all(['components/site-footer.tsx','lib/navigation.ts','app/page.tsx','app/advertise/page.tsx','app/news/page.tsx','app/news/[slug]/page.tsx'].map(read));
  for (const href of ['/news','/radio','/itan-ilu-mi','/forum','/who-is-who','/map','/business-directory','/tourism','/advertise']) assert.ok(navigation.includes(`href: "${href}"`), href);
  for (const href of ['/about','/contact','/guidelines','/photo-credits','/privacy','/terms','/auth','/login']) assert.ok(footer.includes(`href="${href}"`), href);
  assert.match(footer, /<NewsletterForm id="site-footer-newsletter"/);
  assert.doesNotMatch(footer, /sign-up is paused|NewsletterUnavailable/);
  assert.doesNotMatch(home + advertise, /<NewsFooter/);
  assert.match(listing, /<NewsFooter categories=\{categories\} listing/);
  assert.match(article, /<NewsFooter listing/);
});

test('error page includes accessible retry and decorative artwork with reduced motion support', async () => {
  const page = await read('app/error.tsx');
  const styles = await read('app/page-error.module.css');
  assert.match(page, /aria-hidden="true"/);
  assert.match(page, /onClick=\{\(\) => reset\(\)\}/);
  assert.match(styles, /prefers-reduced-motion:no-preference/);
});
