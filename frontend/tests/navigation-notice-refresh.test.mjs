import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');

test('public navbar is global, forest-green, responsive and contains no overlay drawer',()=>{
 const css=read('../apps/main/components/navigation-refinement.css');
 const global=read('../apps/main/app/globals.css');
 const header=read('../apps/main/components/site-header.tsx');
 assert.match(header,/news-utilitybar/);
 assert.match(header,/aria-label="Utility links"/);
 assert.match(header,/aria-label="Main navigation"/);
 assert.match(header,/primaryNavigation\(items\)/);
 assert.match(header,/<details className="nav-more"/);
 assert.match(header,/aria-current=\{current\(pathname, item\.href\)/);
 assert.match(header,/nav-more__appearance[\s\S]*<ThemeToggle \/>/);
 assert.match(css,/\.site-head\s*\{[^}]*position:sticky/);
 assert.match(css,/background:#063d2b/);
 assert.match(css,/\.site-head \.nav-items\s*\{[^}]*overflow-x:auto/);
 assert.match(css,/\.site-head \.header-signin\s*\{[^}]*display:inline-flex/);
 assert.match(css,/min-height:44px/);
 assert.doesNotMatch(header,/site-head__menu|drawer-root|drawer-scrim|aria-modal|drawerOpen/);
 assert.doesNotMatch(global,/\.site-head__menu|\.drawer-root|\.drawer-scrim/);
});

test('compact notices retain measured reachability, live regions, clear messages and 44px controls',()=>{
 const css=read('../apps/main/app/notice-refinement.css');
 const source=read('../apps/main/app/connectivity.tsx');
 assert.match(css,/\.toast__title\s*\{[^}]*font-size: 13px/);
 assert.match(css,/\.toast__text\s*\{[^}]*font-size: 11px/);
 assert.match(css,/border-radius: 8px/);
 assert.match(css,/min-height: 44px; min-width: 44px/);
 assert.match(source,/role="status" aria-live="polite"/);
 assert.match(source,/role="alert" aria-live="assertive"/);
 assert.match(source,/Dismiss connection notice/);
 assert.match(source,/result === "online"/);
 assert.match(source,/toast__title/);
});
