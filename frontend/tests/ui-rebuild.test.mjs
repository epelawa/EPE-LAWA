import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function files(dir){return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(`${dir}/${e.name}`):[`${dir}/${e.name}`]);}
// Turn 5: full-bleed pages (directory, business profile) add the page-full-bleed opt-out to their page class.
test('every public page has rebuilt editorial or account markup, not the old narrow wrapper',()=>{
  const pages=files('frontend/apps/main/app').filter(f=>f.endsWith('/page.tsx'));
  assert.ok(pages.length>=25);
  for(const file of pages){const source=read(file);if(file.includes('/app/admin/'))continue;assert.match(source,/PageFrame|AccountShell|InformationPage|public-home|LinkIssueView|member-dashboard-shell|<MapAssistant \/>|className=\{styles\.page\}|className=\{`\$\{styles\.page\} page-full-bleed`\}/,file);assert.doesNotMatch(source,/max-w-md mx-auto px-4 py-12|landing-hero/,file);}
});
test('new design scales display roles to 90 percent and retains readable body/control floors',()=>{
  const css=read('frontend/apps/main/app/globals.css');const layout=read('frontend/apps/main/app/layout.tsx');const header=read('frontend/apps/main/components/site-header.tsx');assert.match(css,/--text-display: clamp\(2\.025rem, 4\.8vw, 3\.6rem\)/);assert.match(css,/--text-title: clamp\(1\.25rem, 2\.4vw, 1\.575rem\)/);assert.match(css,/font-size: 16px/);assert.match(css,/min-height: 44px/);assert.match(css,/prefers-reduced-motion/);assert.doesNotMatch(css,/#(?:da251c|ff4a3d|17253a)\b/i);assert.match(css,/:root\s*\{[\s\S]*color-scheme:\s*light/);assert.doesNotMatch(css,/data-theme="dark"|color-scheme:\s*dark/);assert.match(layout,/<html\b/);assert.match(layout,/data-theme="light"/);assert.match(layout,/colorScheme: "light"/);assert.doesNotMatch(header,/ThemeToggle|Appearance|appearance/);
});
test('homepage preserves all 52 credited photos and restores its two original hero photos',()=>{
  const source=read('frontend/apps/main/app/page.tsx');
  const carousel=read('frontend/apps/main/components/hero-carousel.tsx');
  const credits=read('docs/hero-image-sources.md');
  const heroCss=read('frontend/apps/main/app/hero-logo.css');
  const manifest=JSON.parse(read('frontend/apps/main/lib/hero-images.json'));
  assert.match(source,/<HeroCarousel>/);
  assert.match(source,/"home.title.line1"/);
  assert.match(source,/getLatestStories\(3\)/);
  assert.match(source,/aria-label="Explore EPE LAWA"/);
  assert.equal(manifest.length,54);
  assert.equal(manifest.slice(2).length,52);
  assert.deepEqual(manifest.slice(0,2).map(slide=>slide.slug),['new-epe-road','fish-statue-epe']);
  assert.equal(new Set(manifest.map(slide=>slide.source)).size,54);
  assert.doesNotMatch(source,/home-hero__brand/);
  assert.match(source,/href="\/news" className="btn-primary">\{t\(lang, "home.cta.news"\)\}/);
  assert.doesNotMatch(source,/Stories worth knowing|History worth keeping|Places worth finding|People worth connecting/);
  assert.doesNotMatch(carousel,/Epe · Lagos State|Rooted in the community\. Open to everyone\./);
  assert.match(carousel,/setTimeout|setInterval|ROTATION_DELAY/);
  assert.match(carousel,/prefers-reduced-motion/);
  assert.match(carousel,/aria-roledescription="slide"/);
  assert.doesNotMatch(carousel,/home-hero__caption|home-hero__credit|home-hero__slide-label|home-hero__counter|Photo by <a/);
  assert.match(read('frontend/apps/main/app/photo-credits/page.tsx'),/href=\{image\.licenseUrl\}/);
  assert.match(read('frontend/apps/main/components/news-footer.tsx'),/photo-credits/);
  assert.match(carousel,/HERO_SLIDES = heroImages/);
  assert.doesNotMatch(carousel,/Photo by \{slide\.author\}/);
  assert.match(credits,/CC BY-SA 4\.0|CC0 1\.0/);
  assert.match(carousel,/home-hero__media/);
  assert.doesNotMatch(carousel,/Epe · Lagos State|Rooted in the community\. Open to everyone\./);
  assert.doesNotMatch(source+carousel,/HeroArt|hero-art|sckooly|jasab|getquant|unsplash|pexels/i);
  assert.match(heroCss,/object-fit:\s*cover/);
  assert.match(heroCss,/padding:\s*0/);
  assert.match(heroCss,/\.home-hero__visual/);
  assert.match(read('frontend/apps/main/components/brand.tsx'),/style=\{\{ width: markWidth, height: size \}\}/);
});
test('storage notice is homepage-only and contact/policy pages disclose unavailable intake without exposing the private mailbox',()=>{
  const banner=read('frontend/apps/main/components/cookie-banner.tsx');assert.match(banner,/Sign-in uses essential cookies\. See our privacy notice/);assert.doesNotMatch(banner,/optional tracking is off/,'Plerdy analytics load in production, so the notice must not claim tracking is off');assert.match(banner,/window\.removeEventListener\("resize", apply\);\s*root\.style\.setProperty\("--storage-notice-height", "0px"\)/);
  const layout=read('frontend/apps/main/app/layout.tsx');const home=read('frontend/apps/main/app/page.tsx');const styles=read('frontend/apps/main/app/notice-refinement.css');assert.doesNotMatch(layout,/CookieBanner/);assert.match(home,/CookieBanner/);assert.match(styles,/body:has\(\.public-home\) \.storage-notice\s*\{[^}]*position:\s*fixed/s);assert.match(styles,/body:not\(:has\(\.public-home\)\) \.storage-notice\s*\{[^}]*display:\s*none/s);
  const privacy=read('frontend/apps/main/app/privacy/page.tsx');assert.match(privacy,/Supabase/);assert.match(privacy,/session cookies/);const contact=read('frontend/apps/main/app/contact/page.tsx');assert.match(contact,/Coming Soon/);assert.match(contact,/nothing is sent or stored/i);assert.doesNotMatch(contact,/<form|ContactForm|mailto:|info\.epelawa@gmail\.com/i);
  for(const file of ['frontend/apps/main/app/about/page.tsx','frontend/apps/main/app/contact/page.tsx','frontend/apps/main/app/guidelines/page.tsx','frontend/apps/main/app/privacy/page.tsx','frontend/apps/main/app/terms/page.tsx','frontend/apps/main/public/.well-known/security.txt'])assert.doesNotMatch(read(file),/info\.epelawa@gmail\.com|mailto:/i,file);
});
test('map location remains explicit and its security policy allows only self on the map route',()=>{
  const map=read('frontend/apps/main/app/map/map-search.tsx');assert.match(map,/onClick=\{requestLocation\}/);assert.match(map,/getCurrentPosition/);assert.match(map,/EPE LAWA does not store/);const config=read('frontend/apps/main/next.config.ts');
  // Turn 5: Permissions-Policy is fixed per document, so a /map-only allowance never applied after
  // in-app navigation and the button failed without a prompt. Geolocation is now allowed for our own
  // origin site-wide (still click-only and still prompting); camera and microphone stay denied.
  assert.match(config,/key: "Permissions-Policy", value: "camera=\(\), microphone=\(\), geolocation=\(self\)"/);assert.doesNotMatch(config,/geolocation=\(\)"/);assert.doesNotMatch(config,/geolocation=\*/);
});
test('every admin page has actual rebuilt markup and complete workflow navigation',()=>{
  for(const file of files('frontend/apps/admin/app').filter(f=>f.endsWith('/page.tsx')))assert.match(read(file),/PageIntro|export \{ default \} from/,file);
  const nav=read('frontend/apps/admin/lib/navigation.ts');for(const route of ['/itan-ilu-mi/review','/business-review/moderation','/tourism','/radio','/people'])assert.ok(nav.includes(`href: "${route}"`),route);
  assert.doesNotMatch(nav,/label: "Who is Who review", href: "\/itan-ilu-mi/);
  assert.match(read('frontend/apps/admin/app/(protected)/layout.tsx'),/AdminAccessGuard/);assert.match(read('frontend/apps/admin/components/admin-access-guard.tsx'),/getAdminAccessForSession/);assert.ok(!fs.existsSync(path.join(root,'frontend/apps/admin/app/loading.tsx')));assert.ok(fs.existsSync(path.join(root,'frontend/apps/admin/app/(protected)/loading.tsx')));
  assert.match(read('frontend/apps/admin/components/site-header.tsx'),/aria-modal="true"/);
});

test('homepage story cards use published covers',()=>{
  const data=read('frontend/apps/main/lib/home-data.ts');
  const home=read('frontend/apps/main/app/page.tsx');
  const newsImage=read('frontend/apps/main/components/news-image.tsx');
  const styles=read('frontend/apps/main/app/hero-logo.css');
  assert.match(data,/author_name/);
  assert.match(data,/cover_url,cover_alt/);
  assert.match(data,/publishedNewsCover\(row\)/);
  assert.match(home,/story\.authorName/);
  assert.match(home,/story\.cover\?\.alt \?\? "EPE LAWA logo"/);
  assert.match(newsImage,/data-news-fallback=\{fallback \? "true" : undefined\}/);
  assert.match(read("frontend/apps/main/app/photo-credits/page.tsx"),/image\.license/);
  assert.match(home,/index === 0 \? "home-story-item home-story-item--lead"/);
  assert.match(home,/home-story-item--support/);
  assert.match(home,/"home.byline.unavailable"/);
  assert.match(styles,/\.home-story-cover-link \{[^}]*aspect-ratio:\s*16\s*\/\s*10/);
  assert.match(styles,/\.home-story-list--3 \{[^}]*grid-template-columns:\s*minmax\(0,\s*2fr\)\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(styles,/\.home-story-item--support \.home-story-cover-link \{[^}]*aspect-ratio:\s*4\s*\/\s*3/);
  assert.match(styles,/\.home-story-cover-attribution/);
  assert.match(styles,/\.home-story-cover--unavailable/);
  assert.doesNotMatch(data+home,/sampleStory|mockArticles|placeholder image/i);
});
