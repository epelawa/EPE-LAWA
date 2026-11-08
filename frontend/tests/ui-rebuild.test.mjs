import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function files(dir){return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(`${dir}/${e.name}`):[`${dir}/${e.name}`]);}
test('every public page has rebuilt editorial or account markup, not the old narrow wrapper',()=>{
  const pages=files('frontend/apps/main/app').filter(f=>f.endsWith('/page.tsx'));
  assert.ok(pages.length>=25);
  for(const file of pages){const source=read(file);assert.match(source,/PageFrame|AccountShell|InformationPage|public-home/,file);assert.doesNotMatch(source,/max-w-md mx-auto px-4 py-12|landing-hero/,file);}
});
test('new design scales display roles to 90 percent and retains readable body/control floors',()=>{
  const css=read('frontend/apps/main/app/globals.css');assert.match(css,/--text-display: clamp\(2\.025rem, 4\.8vw, 3\.6rem\)/);assert.match(css,/--text-title: clamp\(1\.25rem, 2\.4vw, 1\.575rem\)/);assert.match(css,/font-size: 16px/);assert.match(css,/min-height: 44px/);assert.match(css,/prefers-reduced-motion/);assert.doesNotMatch(css,/#(?:da251c|ff4a3d|17253a)\b/i);assert.match(css,/\[data-theme="dark"\]/);
});
test('hero uses the supplied official logo without cropping or invented artwork',()=>{
  const source=read('frontend/apps/main/app/page.tsx');assert.match(source,/src="\/brand-logo\.png"/);assert.match(source,/home-hero__art--logo/);assert.doesNotMatch(source,/epe-lagoon-editorial|HeroArt|hero-art|sckooly|jasab|getquant/i);assert.match(read('frontend/apps/main/app/hero-logo.css'),/object-fit: contain/);assert.match(read('frontend/apps/main/components/brand.tsx'),/style=\{\{ width: markWidth, height: size \}\}/);
});
test('storage and contact UI disclose actual session and delivery behavior',()=>{
  assert.match(read('frontend/apps/main/components/cookie-banner.tsx'),/essential session cookies/);const privacy=read('frontend/apps/main/app/privacy/page.tsx');assert.match(privacy,/Supabase/);assert.match(privacy,/session cookies/);const contact=read('frontend/apps/main/app/contact/page.tsx');assert.match(contact,/Coming Soon/);assert.match(contact,/does not send or store/);
});
test('map location remains explicit and its security policy allows only self on the map route',()=>{
  const map=read('frontend/apps/main/app/map/map-search.tsx');assert.match(map,/onClick=\{requestLocation\}/);assert.match(map,/getCurrentPosition/);assert.match(map,/not stored by EPE LAWA/);const config=read('frontend/apps/main/next.config.ts');assert.match(config,/source: "\/map"/);assert.match(config,/geolocation=\(self\)/);assert.match(config,/geolocation=\(\)/);
});
test('every admin page has actual rebuilt markup and complete workflow navigation',()=>{
  for(const file of files('frontend/apps/admin/app').filter(f=>f.endsWith('/page.tsx')))assert.match(read(file),/PageIntro/,file);
  const nav=read('frontend/apps/admin/lib/navigation.ts');for(const route of ['/itan-ilu-mi/review','/business-review/moderation','/tourism','/radio','/people'])assert.ok(nav.includes(`href: "${route}"`),route);
  assert.doesNotMatch(nav,/label: "Who is Who review", href: "\/itan-ilu-mi/);
  assert.match(read('frontend/apps/admin/app/(protected)/layout.tsx'),/getAdminAccessForSession/);assert.ok(!fs.existsSync(path.join(root,'frontend/apps/admin/app/loading.tsx')));assert.ok(fs.existsSync(path.join(root,'frontend/apps/admin/app/(protected)/loading.tsx')));
  assert.match(read('frontend/apps/admin/components/site-header.tsx'),/aria-modal="true"/);
});
