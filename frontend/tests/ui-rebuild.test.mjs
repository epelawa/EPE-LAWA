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
  for(const file of pages){const source=read(file);if(file.includes('/app/admin/'))continue;assert.match(source,/PageFrame|AccountShell|InformationPage|public-home|LinkIssueView|member-dashboard-shell/,file);assert.doesNotMatch(source,/max-w-md mx-auto px-4 py-12|landing-hero/,file);}
});
test('new design scales display roles to 90 percent and retains readable body/control floors',()=>{
  const css=read('frontend/apps/main/app/globals.css');assert.match(css,/--text-display: clamp\(2\.025rem, 4\.8vw, 3\.6rem\)/);assert.match(css,/--text-title: clamp\(1\.25rem, 2\.4vw, 1\.575rem\)/);assert.match(css,/font-size: 16px/);assert.match(css,/min-height: 44px/);assert.match(css,/prefers-reduced-motion/);assert.doesNotMatch(css,/#(?:da251c|ff4a3d|17253a)\b/i);assert.match(css,/\[data-theme="dark"\]/);
});
test('homepage hero uses two newly sourced Epe photos without invented artwork',()=>{
  const source=read('frontend/apps/main/app/page.tsx');
  const carousel=read('frontend/apps/main/components/hero-carousel.tsx');
  const credits=read('docs/hero-image-sources.md');
  const heroCss=read('frontend/apps/main/app/hero-logo.css');
  const manifest=JSON.parse(read('frontend/apps/main/lib/hero-images.json'));
  assert.match(source,/<HeroCarousel\s*\/>/);
  assert.equal(manifest.length,2);
  assert.equal(new Set(manifest.map(slide=>slide.source)).size,2);
  assert.ok(manifest.some(slide=>slide.source.endsWith('File:New_Epe_lagos_road.jpg')));
  assert.ok(manifest.some(slide=>slide.source.endsWith('File:Fish_Statue_Epe.jpg')));
  assert.doesNotMatch(source,/home-hero__brand|BrandLockup/);
  assert.match(source,/Epe\.<br \/><em>Closer to home\.<\/em>/);
  assert.match(source,/A digital home for Epe’s news, heritage, businesses and community voices\./);
  assert.match(source,/className=\{`home-story-list home-story-list--\$\{stories\.items\.length\}`\}/);
  assert.match(source,/getLatestStories\(3\)/);
  assert.doesNotMatch(source,/Stories worth knowing|History worth keeping|Places worth finding|People worth connecting/);
  assert.doesNotMatch(carousel,/Epe · Lagos State|Rooted in the community\. Open to everyone\./);
  assert.match(carousel,/<button[\s\S]*?home-hero__pause/);
  assert.match(carousel,/ROTATION_DELAY_MS = 7200/);
  assert.match(carousel,/prefers-reduced-motion: reduce/);
  assert.match(carousel,/isConstrainedConnection\(\)/);
  assert.doesNotMatch(carousel,/home-hero__controls|home-hero__counter|Previous photo:|Next photo:/);
  assert.match(source,/Quick access to EPE LAWA features/);
  assert.match(carousel,/Photo by <a href=\{slide\.source\}/);
  assert.match(carousel,/href=\{slide\.licenseUrl\}/);
  assert.match(read('frontend/apps/main/app/photo-credits/page.tsx'),/href=\{image\.licenseUrl\}/);
  assert.match(read('frontend/apps/main/components/site-footer.tsx'),/photo-credits/);
  assert.match(carousel,/HERO_SLIDES = heroImages/);
  assert.doesNotMatch(carousel,/Photo by \{slide\.author\}/);
  assert.match(credits,/CC BY-SA 4\.0|CC0 1\.0/);
  assert.match(carousel,/home-hero__media/);
  assert.doesNotMatch(carousel,/Epe · Lagos State|Rooted in the community\. Open to everyone\./);
  assert.doesNotMatch(source+carousel,/HeroArt|hero-art|sckooly|jasab|getquant|unsplash|pexels/i);
  assert.match(heroCss,/object-fit: cover/);
  assert.match(heroCss,/padding: 0/);
  assert.match(heroCss,/\.home-hero__visual/);
  assert.match(read('frontend/apps/main/components/brand.tsx'),/style=\{\{ width: markWidth, height: size \}\}/);
});
test('storage notice is homepage-only and contact/policy pages disclose unavailable intake without exposing the private mailbox',()=>{
  const banner=read('frontend/apps/main/components/cookie-banner.tsx');assert.match(banner,/Sign-in uses essential cookies; optional tracking is off/);assert.match(banner,/window\.removeEventListener\("resize", apply\);\s*root\.style\.setProperty\("--storage-notice-height", "0px"\)/);
  const layout=read('frontend/apps/main/app/layout.tsx');const home=read('frontend/apps/main/app/page.tsx');const styles=read('frontend/apps/main/app/notice-refinement.css');assert.doesNotMatch(layout,/CookieBanner/);assert.match(home,/CookieBanner/);assert.match(styles,/body:has\(\.public-home\) \.storage-notice\s*\{[^}]*position:\s*fixed/s);assert.match(styles,/body:not\(:has\(\.public-home\)\) \.storage-notice\s*\{[^}]*display:\s*none/s);
  const privacy=read('frontend/apps/main/app/privacy/page.tsx');assert.match(privacy,/Supabase/);assert.match(privacy,/session cookies/);const contact=read('frontend/apps/main/app/contact/page.tsx');assert.match(contact,/Coming Soon/);assert.match(contact,/nothing is sent or stored/i);assert.doesNotMatch(contact,/<form|ContactForm|mailto:|info\.epelawa@gmail\.com/i);
  for(const file of ['frontend/apps/main/app/about/page.tsx','frontend/apps/main/app/contact/page.tsx','frontend/apps/main/app/guidelines/page.tsx','frontend/apps/main/app/privacy/page.tsx','frontend/apps/main/app/terms/page.tsx','frontend/apps/main/public/.well-known/security.txt'])assert.doesNotMatch(read(file),/info\.epelawa@gmail\.com|mailto:/i,file);
});
test('map location remains explicit and its security policy allows only self on the map route',()=>{
  const map=read('frontend/apps/main/app/map/map-search.tsx');assert.match(map,/onClick=\{requestLocation\}/);assert.match(map,/getCurrentPosition/);assert.match(map,/EPE LAWA does not store/);const config=read('frontend/apps/main/next.config.ts');assert.match(config,/source: "\/map"/);assert.match(config,/geolocation=\(self\)/);assert.match(config,/geolocation=\(\)/);
});
test('every admin page has actual rebuilt markup and complete workflow navigation',()=>{
  for(const file of files('frontend/apps/admin/app').filter(f=>f.endsWith('/page.tsx')))assert.match(read(file),/PageIntro/,file);
  const nav=read('frontend/apps/admin/lib/navigation.ts');for(const route of ['/itan-ilu-mi/review','/business-review/moderation','/tourism','/radio','/people'])assert.ok(nav.includes(`href: "${route}"`),route);
  assert.doesNotMatch(nav,/label: "Who is Who review", href: "\/itan-ilu-mi/);
  assert.match(read('frontend/apps/admin/app/(protected)/layout.tsx'),/AdminAccessGuard/);assert.match(read('frontend/apps/admin/components/admin-access-guard.tsx'),/getAdminAccessForSession/);assert.ok(!fs.existsSync(path.join(root,'frontend/apps/admin/app/loading.tsx')));assert.ok(fs.existsSync(path.join(root,'frontend/apps/admin/app/(protected)/loading.tsx')));
  assert.match(read('frontend/apps/admin/components/site-header.tsx'),/aria-modal="true"/);
});

test('homepage story cards use published bylines and only fully credited cover images',()=>{
  const data=read('frontend/apps/main/lib/home-data.ts');
  const home=read('frontend/apps/main/app/page.tsx');
  const styles=read('frontend/apps/main/app/hero-logo.css');
  assert.match(data,/author_name,og_image_key/);
  assert.doesNotMatch(data,/cover_url|cover_alt|cover_credit|cover_source_url|cover_license_url|cover_caption/);
  assert.doesNotMatch(data,/publicMediaUrl/);
  assert.match(data,/selectedNewsCover\(row\.og_image_key\)/);
  assert.match(home,/story\.authorName/);
  assert.match(home,/story\.cover\.alt/);
  assert.match(home,/story\.cover\.source/);
  assert.match(home,/story\.cover\.license/);
  assert.match(home,/index === 0 \? "home-story-item home-story-item--lead"/);
  assert.match(home,/home-story-item--support/);
  assert.match(home,/No credited cover image available/);
  assert.match(home,/Byline unavailable/);
  assert.match(styles,/\.home-story-cover-link \{[^}]*aspect-ratio: 16 \/ 10/);
  assert.match(styles,/\.home-story-list--3 \{[^}]*grid-template-columns: minmax\(0, 2fr\) repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles,/\.home-story-item--support \.home-story-cover-link \{[^}]*aspect-ratio: 4 \/ 3/);
  assert.match(styles,/\.home-story-cover-attribution/);
  assert.match(styles,/\.home-story-cover--unavailable/);
  assert.doesNotMatch(data+home,/sampleStory|mockArticles|placeholder image/i);
});
