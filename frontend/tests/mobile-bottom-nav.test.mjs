import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mobileNavigationCurrentState, shouldRenderMobileNavigation} from '../apps/main/lib/navigation.ts';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const nav=read('../apps/main/components/mobile-bottom-nav.tsx');
const css=read('../apps/main/components/navigation-refinement.css');
const homeCss=read('../apps/main/app/hero-logo.css');
const layout=read('../apps/main/app/layout.tsx');
const dashboardCss=read('../apps/main/app/dashboard/dashboard.module.css');
const dashboard=read('../apps/main/app/dashboard/page.tsx');

test('mobile bottom navigation matches the dashboard tabs and uses only mounted routes',()=>{
  for (const [label,href] of [['Home','/dashboard?tab=home'],['Discover','/dashboard?tab=discover'],['Saved','/dashboard?tab=saved'],['Profile','/dashboard?tab=profile']]) {
    assert.match(nav,new RegExp(`label: "${label}", Icon:`));
    assert.match(nav,new RegExp(`href: "${href.replaceAll('/','\\/').replaceAll('?','\\?')}", label: "${label}"`));
  }
  assert.doesNotMatch(nav,/PUBLIC_TABS|label: "News"|label: "Account"/);
  assert.match(nav,/DASHBOARD_TABS\.map\(\(tab\)/);
  const mobileLandmark=nav.match(/<nav className="mobile-bottom-nav" aria-label="(Mobile (?:primary|bottom) navigation)"/);
  assert.ok(mobileLandmark?.[1].trim(),'mobile bottom tabs expose a named navigation landmark');
  const tabs=nav.match(/const DASHBOARD_TABS:[\s\S]*?\n\];/);
  assert.ok(tabs,'dashboard tabs declaration exists');
  assert.equal([...tabs[0].matchAll(/\{ key: "(?:home|discover|saved|profile)", href:/g)].length,4);
  assert.match(nav,/aria-current=\{current\}/);
  assert.doesNotMatch(layout,/MobileBottomNav/);
  assert.match(dashboard,/if \(authError \|\| !user\) redirect[\s\S]*?<MobileBottomNav\s*\/>/);
});

test('mobile bottom tabs mark exact pages and the Discover section semantically',()=>{
  assert.equal(mobileNavigationCurrentState('/','home'),undefined);
  assert.equal(mobileNavigationCurrentState('/dashboard','home','?tab=home'),'page');
  assert.equal(mobileNavigationCurrentState('/dashboard','home'),'page');
  assert.equal(mobileNavigationCurrentState('/dashboard','home','?tab=unknown'),'page');
  assert.equal(mobileNavigationCurrentState('/dashboard','discover','?tab=discover'),'page');
  assert.equal(mobileNavigationCurrentState('/dashboard','saved','?tab=saved'),'page');
  assert.equal(mobileNavigationCurrentState('/dashboard','profile','?tab=profile'),'page');
  assert.equal(mobileNavigationCurrentState('/dashboard','saved','?tab=profile'),undefined);
  assert.equal(mobileNavigationCurrentState('/map','discover'),undefined);
  assert.equal(mobileNavigationCurrentState('/business-directory/orders','discover'),undefined);
  assert.equal(mobileNavigationCurrentState('/forum','discover'),undefined);
});

test('private screens are excluded; mobile bar has keyboard/touch access and no overlap',()=>{
  for (const path of ['/','/news','/tourism','/map','/forum','/admin','/admin/newsroom','/auth/verify','/login','/forgot-password','/status/500']) {
    assert.equal(shouldRenderMobileNavigation(path),false,path);
  }
  assert.equal(shouldRenderMobileNavigation('/dashboard'),true);
  assert.equal(shouldRenderMobileNavigation('/dashboard/profile'),false);
  assert.match(css,/@media\s*\(max-width:\s*767px\)/);
  assert.match(css,/\.mobile-bottom-nav__link[^\{]*\{[^}]*min-height:\s*56px/);
  assert.match(css,/grid-template-columns:\s*repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css,/body:has\(\.mobile-bottom-nav\)[^{]*\{[^}]*padding-bottom:\s*calc\(68px \+ env\(safe-area-inset-bottom/);
  assert.match(homeCss,/\.public-home\s+\.home-news\s*\{[^}]*padding-top:\s*32px/);
  assert.match(css,/env\(safe-area-inset-bottom,\s*0px\)/);
  assert.match(css,/\.mobile-bottom-nav__link:focus-visible/);
  assert.match(css,/body:has\(\.mobile-bottom-nav\) \.toast-region\s*\{[^}]*bottom:\s*calc\(76px/);
  assert.match(css,/body:has\(\.focused-error-shell\) \.mobile-bottom-nav/);
  assert.match(dashboardCss,/@media\s*\(max-width:\s*767px\)\s*\{\s*\.tabs\s*\{\s*display:\s*none;\s*\}\s*\}/);
  assert.match(nav,/aria-label="Mobile primary navigation"/);
  const header=read('../apps/main/components/site-header.tsx');
  assert.doesNotMatch(header,/Appearance|appearance|ThemeToggle|Member dashboard|href="\/dashboard"/);
  assert.match(header,/renderLink\("\/auth", "Create account", "btn-primary"\)/);
  assert.match(header,/renderLink\("\/login", "Sign in", "btn-secondary"\)/);
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
