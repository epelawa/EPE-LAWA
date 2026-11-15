import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dashboardNavigationCurrentState, mobileNavigationCurrentState, shouldRenderMobileNavigation} from '../apps/main/lib/navigation.ts';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const nav=read('../apps/main/components/mobile-bottom-nav.tsx');
const css=read('../apps/main/components/navigation-refinement.css');
const homeCss=read('../apps/main/app/hero-logo.css');
const layout=read('../apps/main/app/layout.tsx');
const icons=read('../apps/main/components/icons.tsx');
const dashboard=read('../apps/main/app/dashboard/page.tsx');

test('public mobile navigation retains the four approved routes and accessible landmark',()=>{
  for (const [label,href] of [['Home','/'],['News','/news'],['Discover','/tourism'],['Account','/dashboard']]) {
    assert.match(nav,new RegExp(`label: "${label}", Icon:`));
    assert.match(nav,new RegExp(`href: "${href.replaceAll('/','\\/')}", label: "${label}"`));
  }
  assert.match(nav,/aria-label=\{isDashboard \? "Member dashboard navigation" : "Mobile primary navigation"\}/);
  assert.equal([...nav.matchAll(/\{ key: "(?:home|news|discover|account)", href:/g)].length,4);
  assert.match(nav,/label: "News", Icon: NewsTabIcon/,'News uses its dedicated newspaper-style tab icon');
  const newsIcon=icons.match(/export const NewsTabIcon\s*=([\s\S]*?<\/svg>)/);
  assert.ok(newsIcon?.[1],'the reference-style News icon is an inline SVG');
  assert.match(newsIcon[1],/aria-hidden="true"/);
  assert.match(newsIcon[1],/fill="currentColor"/);
  assert.match(newsIcon[1],/fill="#F1F4FA"/);
  assert.match(newsIcon[1],/fill="#A7C5F5"/);
  assert.match(nav,/aria-current=\{current\}/);
  assert.match(nav,/shouldRenderMobileNavigation\(pathname\)/,'the shared component uses route visibility');
  assert.match(layout,/MobileBottomNav/);
});

test('signed-in dashboard uses Home, Discover, Saved and Profile with actual section targets',()=>{
  for (const [key,href,label] of [
    ['dashboardHome','/dashboard#home','Home'],
    ['dashboardDiscover','/dashboard#discover','Discover'],
    ['dashboardSaved','/dashboard#saved','Saved'],
    ['dashboardProfile','/dashboard#profile','Profile'],
  ]) {
    assert.match(nav,new RegExp(`key: "${key}", href: "${href.replaceAll('/','\\/')}", label: "${label}"`));
  }
  assert.match(nav,/usePathname\(\)/);
  assert.match(nav,/window\.addEventListener\("hashchange", syncHash\)/);
  for (const id of ['home','discover','saved','profile']) assert.match(dashboard,new RegExp(`id="${id}"`),`missing #${id} dashboard destination`);
  assert.match(dashboard,/Saved-item tools are not connected to member accounts yet/);
  assert.match(dashboard,/className=\{styles\.profileForm\}|<ProfileEditor/);
  assert.match(dashboard,/aria-label="Discover EPE LAWA"/);
});

test('mobile bottom navigation is absent only at the homepage and remains on requested destinations',()=>{
  assert.equal(shouldRenderMobileNavigation('/'),false,'the main page has no mobile bottom bar');
  for (const path of ['/news','/tourism','/dashboard']) assert.equal(shouldRenderMobileNavigation(path),true,path);
});

test('public and dashboard tabs mark the current page or section semantically',()=>{
  assert.equal(mobileNavigationCurrentState('/news','news'),'page');
  assert.equal(mobileNavigationCurrentState('/tourism','discover'),'page');
  assert.equal(mobileNavigationCurrentState('/dashboard','account'),'page');
  assert.equal(mobileNavigationCurrentState('/news/story','news'),'page');
  assert.equal(mobileNavigationCurrentState('/map','discover'),'location');
  assert.equal(mobileNavigationCurrentState('/business-directory/orders','discover'),'location');
  assert.equal(mobileNavigationCurrentState('/forum','discover'),undefined);
  assert.equal(dashboardNavigationCurrentState('/dashboard','','dashboardHome'),'page');
  assert.equal(dashboardNavigationCurrentState('/dashboard','#home','dashboardHome'),'page');
  assert.equal(dashboardNavigationCurrentState('/dashboard','#discover','dashboardDiscover'),'page');
  assert.equal(dashboardNavigationCurrentState('/dashboard','#saved','dashboardSaved'),'page');
  assert.equal(dashboardNavigationCurrentState('/dashboard','#profile','dashboardProfile'),'page');
  assert.equal(dashboardNavigationCurrentState('/news','#profile','dashboardProfile'),undefined);
});

test('private screens are excluded; mobile bar has keyboard/touch access and no overlap',()=>{
  for (const path of ['/admin','/admin/newsroom','/auth/verify','/login','/forgot-password','/status/500']) assert.equal(shouldRenderMobileNavigation(path),false,path);
  assert.equal(shouldRenderMobileNavigation('/dashboard'),true);
  assert.match(css,/@media \(max-width: 767px\)/);
  assert.match(css,/\.mobile-bottom-nav__link[^\{]*\{[^}]*min-height: 56px/);
  assert.match(css,/grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css,/body:has\(\.mobile-bottom-nav\)[^\{]*\{[^}]*padding-bottom: calc\(68px \+ env\(safe-area-inset-bottom/);
  assert.match(homeCss,/\.public-home \.home-news \{ padding-top: 32px; \}/);
  assert.match(css,/env\(safe-area-inset-bottom, 0px\)/);
  assert.match(css,/\.mobile-bottom-nav__link:focus-visible/);
  assert.match(css,/body:has\(\.public-home\):has\(\.mobile-bottom-nav\) \.storage-notice \{ bottom: calc\(76px/);
  assert.match(css,/body:has\(\.mobile-bottom-nav\) \.toast-region \{ bottom: calc\(76px/);
  assert.match(css,/body:has\(\.focused-error-shell\) \.mobile-bottom-nav/);
  const header=read('../apps/main/components/site-header.tsx');
  const desktopLandmark=header.match(/<nav ref=\{desktopNavRef\} className="site-head__nav" aria-label="([^"]+)"/);
  const menuNames=header.match(/aria-label=\{drawerOpen \? "([^"]+)" : "([^"]+)"\}/);
  assert.ok(desktopLandmark?.[1].trim(),'desktop navigation exposes a named navigation landmark');
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
