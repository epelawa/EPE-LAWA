import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mobileNavigationCurrentState, shouldRenderMobileNavigation} from '../apps/main/lib/navigation.ts';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const nav=read('../apps/main/components/mobile-bottom-nav.tsx');
const css=read('../apps/main/components/navigation-refinement.css');
const homeCss=read('../apps/main/app/hero-logo.css');
const layout=read('../apps/main/app/layout.tsx');

test('mobile bottom navigation matches the reference tabs and uses only mounted routes',()=>{
  for (const [label,href] of [['Home','/'],['News','/news'],['Discover','/tourism'],['Account','/dashboard']]) {
    assert.match(nav,new RegExp(`label: "${label}", Icon:`));
    assert.match(nav,new RegExp(`href: "${href.replaceAll('/','\\/')}", label: "${label}"`));
  }
  const mobileLandmark=nav.match(/<nav className="mobile-bottom-nav" aria-label="([^"]+)"/);
  assert.ok(mobileLandmark?.[1].trim(),'mobile bottom tabs expose a named navigation landmark');
  assert.equal([...nav.matchAll(/\{ key: "(?:home|news|discover|account)", href:/g)].length,4);
  assert.match(nav,/aria-current=\{current\}/);
  assert.match(nav,/shouldRenderMobileNavigation\(pathname\)/,'the shared component uses route visibility');
  assert.match(layout,/MobileBottomNav/);
});

test('mobile bottom navigation is absent only at the homepage and remains on the requested destinations',()=>{
  assert.equal(shouldRenderMobileNavigation('/'),false,'the main page has no mobile bottom bar');
  for (const path of ['/news','/tourism','/dashboard']) {
    assert.equal(shouldRenderMobileNavigation(path),true,path);
  }
});

test('News, Discover and Account tabs mark their current routes semantically',()=>{
  assert.equal(mobileNavigationCurrentState('/news','news'),'page');
  assert.equal(mobileNavigationCurrentState('/tourism','discover'),'page');
  assert.equal(mobileNavigationCurrentState('/dashboard','account'),'page');
  assert.equal(mobileNavigationCurrentState('/news/story','news'),'page');
  assert.equal(mobileNavigationCurrentState('/map','discover'),'location');
  assert.equal(mobileNavigationCurrentState('/business-directory/orders','discover'),'location');
  assert.equal(mobileNavigationCurrentState('/forum','discover'),undefined);
});

test('private screens are excluded; mobile bar has keyboard/touch access and no overlap',()=>{
  for (const path of ['/admin','/admin/newsroom','/auth/verify','/login','/forgot-password','/status/500']) {
    assert.equal(shouldRenderMobileNavigation(path),false,path);
  }
  assert.equal(shouldRenderMobileNavigation('/dashboard'),true);
  assert.match(css,/@media \(max-width: 767px\)/);
  assert.match(css,/\.mobile-bottom-nav__link[^\{]*\{[^}]*min-height: 56px/);
  assert.match(css,/grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css,/body:has\(\.mobile-bottom-nav\)[^{]*\{[^}]*padding-bottom: calc\(68px \+ env\(safe-area-inset-bottom/);
  assert.match(homeCss,/\.public-home \.home-news \{ padding-top: 32px; \}/);
  assert.match(css,/env\(safe-area-inset-bottom, 0px\)/);
  assert.match(css,/\.mobile-bottom-nav__link:focus-visible/);
  assert.match(css,/body:has\(\.public-home\):has\(\.mobile-bottom-nav\) \.storage-notice \{ bottom: calc\(76px/);
  assert.match(css,/body:has\(\.mobile-bottom-nav\) \.toast-region \{ bottom: calc\(76px/);
  assert.match(css,/body:has\(\.focused-error-shell\) \.mobile-bottom-nav/);
  const header=read('../apps/main/components/site-header.tsx');
  const desktopLandmark=header.match(/<nav ref=\{desktopNavRef\} className="site-head__nav" aria-label="([^"]+)"/);
  const menuNames=header.match(/aria-label=\{drawerOpen \? "([^"]+)" : "([^"]+)"\}/);
  assert.ok(desktopLandmark?.[1].trim(),'desktop navigation exposes a named landmark');
  assert.ok(menuNames?.[1].trim()&&menuNames?.[2].trim(),'menu trigger has accessible names for open and close states');
  assert.match(header,/aria-label="Close [^"]*menu"/);
});

test('homepage hero copy retains the shared 16px minimum side gutter on phones',()=>{
  const globals=read('../apps/main/app/globals.css');
  const contentRule=homeCss.match(/\.home-hero__content\s*\{([^}]*)\}/);
  assert.ok(contentRule,'hero content rule exists');
  assert.doesNotMatch(contentRule[1],/\bwidth\s*:\s*100%/i,'hero must not override ep-container width');
  assert.match(globals,/--gutter:\s*clamp\(16px,\s*4vw,\s*48px\)/);
  assert.match(globals,/\.ep-container[^\{]*\{\s*width:\s*min\(var\(--content-max\),\s*calc\(100%\s*-\s*var\(--gutter\)\s*\*\s*2\)\)/);
});
