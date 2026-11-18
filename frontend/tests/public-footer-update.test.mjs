import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = (path) => readFile(new URL(`../apps/main/${path}`, import.meta.url), 'utf8');

test('shared public footer and paused signup render consistently across home, News, article and radio routes', async () => {
  const [footer, layout, navigation, home, advertise, listing, article, radio, menu] = await Promise.all(['components/news-footer.tsx','app/layout.tsx','lib/navigation.ts','app/page.tsx','app/advertise/page.tsx','app/news/page.tsx','app/news/[slug]/page.tsx','app/radio/reminders/page.tsx','lib/mobile-navigation.ts'].map(read));
  for (const href of ['/news','/radio','/itan-ilu-mi','/forum','/who-is-who','/map','/business-directory','/tourism','/advertise']) assert.ok(navigation.includes(`href: "${href}"`), href);
  for (const href of ['/about','/contact','/photo-credits','/privacy','/terms']) assert.ok(menu.includes(`"${href}"`), href);
  assert.match(layout, /<NewsFooter listing\s*\/>/);
  assert.match(footer, /<NewsletterForm id="news-listing-signup"/);
  assert.match(footer, /MOBILE_GROUPS\.flatMap/);
  assert.match(footer, /MOBILE_EXTRA_LINKS/);
  assert.equal((footer.match(/<QuickLinks \/>/g) ?? []).length, 2);
  assert.doesNotMatch(home + advertise + listing + article + radio, /<NewsFooter/);
});

test('error page includes accessible retry and decorative artwork with reduced motion support', async () => {
  const page = await read('app/error.tsx');
  const styles = await read('app/page-error.module.css');
  assert.match(page, /aria-hidden="true"/);
  assert.match(page, /onClick=\{\(\) => reset\(\)\}/);
  assert.match(styles, /prefers-reduced-motion:no-preference/);
});

test('mobile footer presents quick links and topics in three columns with wrapping and touch targets', async () => {
  const css = await read('components/news-footer.module.css');
  assert.match(css, /\.listingQuick \.quickLinks, \.column nav ul \{ grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /\.listingColumn:not\(\.listingQuick\) nav \{ grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /min-height:44px; padding:5px 0; font-size:\.8rem; line-height:1\.3; overflow-wrap:anywhere/);
});
