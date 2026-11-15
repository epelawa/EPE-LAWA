import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('navbar keeps Sign in visible and scrolls menu destinations independently of account actions',()=>{
 const css=read('../apps/main/components/navigation-refinement.css');
 const header=read('../apps/main/components/site-header.tsx');
 assert.match(css,/\.header-signin\s*\{[^}]*display: inline-flex/);
 assert.match(css,/\.drawer-nav\s*\{[^}]*overflow-y: auto/);
 assert.match(css,/\.drawer-account\s*\{[^}]*flex: 0 0 auto/);
	 assert.match(css,/\.drawer-label\s*\{[^}]*font-size: \.8125rem/);
 assert.match(header,/navigation-refinement\.css/);
 assert.match(header,/aria-modal="true"/);
 assert.match(header,/event\.key === "Escape"/);
 assert.match(header,/onOutsideDrawer/);
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
