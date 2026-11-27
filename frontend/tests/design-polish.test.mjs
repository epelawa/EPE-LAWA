import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("public shell stays light and the all-viewport drawer is account-only", () => {
  const header = read("frontend/apps/main/components/site-header.tsx");
  const menu = read("frontend/apps/main/lib/mobile-navigation.ts");
	const layout = read("frontend/apps/main/app/layout.tsx");
	const brand = read("frontend/apps/main/components/brand.tsx");
  const staffBrand = read("frontend/apps/admin/components/brand.tsx");
  const footer = read("frontend/apps/main/components/site-footer.tsx");
  const newsFooter = read("frontend/apps/main/components/news-footer.tsx");
  const newsletter = read("frontend/apps/main/components/newsletter-form.tsx");
  const home = read("frontend/apps/main/app/page.tsx");
  const heroCarousel = read("frontend/apps/main/components/hero-carousel.tsx");
  const navCss = read("frontend/apps/main/components/navigation-refinement.css");
  const heroManifest = JSON.parse(read("frontend/apps/main/lib/hero-images.json"));
  const mastheadActions = header.match(/<div className="masthead-actions">([\s\S]*?)<\/div>/)?.[1] ?? "";

	assert.match(layout, /<html lang=\{siteLanguage === "yo" \? "yo" : "en"\} data-theme="light" style=\{\{ colorScheme: "light" \}\} suppressHydrationWarning>/);
  assert.doesNotMatch(header, /ThemeToggle|Appearance|appearance|Member dashboard/);
	assert.doesNotMatch(mastheadActions, /ThemeToggle/);
	assert.match(header, /renderLink\("\/auth", "Create account", "btn-primary"\)/);
	assert.match(header, /renderLink\("\/login", "Sign in", "btn-secondary"\)/);
  assert.match(navCss, /\.site-head__menu\s*\{[^}]*display:inline-flex/);
  assert.match(header, /MOBILE_GROUPS\.map\(renderMobileGroup\)/);
  for (const group of ["Read", "Community", "Explore", "EPE LAWA"]) assert.match(menu, new RegExp(`label: "${group}"`));
  assert.match(navCss, /\.drawer-group ul/);
  assert.doesNotMatch(navCss, /\.drawer-list|\.drawer-foot-links/);
	assert.match(header, /<BrandLockup size=\{32\} \/>/);
  assert.match(header, /<span className="home-brand-tagline">The Voice of Epe Division<\/span>/);
  assert.doesNotMatch(brand + staffBrand + footer, /Epe Division|brand__place|brand-lockup__tagline|showPlace/);
  assert.match(home, /<HeroCarousel>/, "homepage logo hero exists");
  assert.match(home, /"home.title.line1"/);
  assert.doesNotMatch(home, /home-hero__brand/);
  assert.match(home, /href="\/news" className="btn-primary">\{t\(lang, "home.cta.news"\)\}/);
  assert.doesNotMatch(home, /Stories worth knowing|History worth keeping|Places worth finding|People worth connecting|home-topics/);
  assert.equal(heroManifest.length, 54);
  assert.deepEqual(heroManifest.slice(0, 2).map((slide) => slide.slug), ["new-epe-road", "fish-statue-epe"]);
  assert.equal(new Set(heroManifest.map((slide) => slide.source)).size, 54);
  assert.match(heroCarousel, /HERO_SLIDES = heroImages/);
  assert.match(heroCarousel, /setTimeout|setInterval|ROTATION_DELAY/);
  assert.match(heroCarousel, /prefers-reduced-motion/);
  assert.match(heroCarousel, /aria-roledescription="slide"/);
  assert.doesNotMatch(heroCarousel, /home-hero__caption|home-hero__credit|home-hero__slide-label|home-hero__counter|Photo by <a/);
  assert.doesNotMatch(heroCarousel, /Epe Division|The voice of Epe Division/i);
  assert.doesNotMatch(home, /home-hero__quicknav|Quick access to EPE LAWA features|Explore sections/);
  assert.match(header, /A shared home for everyone\./);
  assert.match(header, /addEventListener\("pointerdown", onOutsideDrawer\)/);
  assert.match(newsFooter, /<NewsletterForm id="news-listing-signup" variant="footer" \/>/);
  assert.match(newsFooter, /"footer.tagline"/);
  assert.match(newsletter, /temporarily unavailable/);
  assert.match(newsletter, /disabled/);
  assert.match(navCss, /\.drawer\s*\{[^}]*width:min\(380px,calc\(100vw - 72px\)\)/);
  assert.match(navCss, /\.drawer-account__actions\s*\{[^}]*display:\s*grid/);
});

test("editorial dot decorations are gone and footer links stay split on mobile", () => {
  const css = read("frontend/apps/main/app/globals.css");
  assert.doesNotMatch(css, /\.ui-eyebrow::before|\.home-topics span::before/);
  assert.match(css, /\.footer-columns \{ grid-template-columns: repeat\(2,minmax\(0,1fr\)\); gap: 16px;/);
});

test("owner-approved cobalt palette is consistent across light/dark apps and shared UI", () => {
  const main = read("frontend/apps/main/app/globals.css");
  const admin = read("frontend/apps/admin/app/globals.css");
  const shared = read("frontend/packages/ui/src/tokens.css");
  const sharedCss = read("frontend/packages/ui/src/ui.css");
  const statusPage = read("frontend/apps/main/app/status/[code]/route.ts");
  const palette = ["#0A1023", "#17264A", "#294B91", "#477FE0", "#A7C5F5", "#F1F4FA", "#A6B2C5", "#293650"];
  const statusPalette = ["#0A1023", "#294B91", "#477FE0", "#F1F4FA"];

  for (const color of palette) {
    assert.ok(main.includes(color), `public app is missing ${color}`);
    assert.ok(admin.includes(color), `staff app is missing ${color}`);
    assert.ok(shared.includes(color), `shared tokens are missing ${color}`);
  }
  for (const color of statusPalette) assert.ok(statusPage.includes(color), `status page is missing ${color}`);
  assert.match(main, /--primary: 218\.04 71\.16% 57\.84%;[\s\S]*?--primary-foreground: 225\.6 55\.56% 8\.82%;/);
  assert.match(main, /--link: 220\.38 55\.91% 36\.47%/);
  assert.match(admin, /--link: 220\.38 55\.91% 36\.47%/);
  assert.match(sharedCss, /var\(--primary-foreground,225\.6 55\.56% 8\.82%\)/);
  assert.match(main, /--ui-success: #26614a/);
  assert.match(main, /--ui-warning: #805d18/);
  assert.match(main, /--ui-danger: #a73545/);
  assert.doesNotMatch(main + admin + statusPage, /#(?:60436d|3f2b49|faf9f6|29242d|dbe8ad|c8c1cc|504955|6e6873|e4dee8)\b/i);
});

test("Tidegate loaders remain wired and public motion is hydration-safe", () => {
  const publicMotion = read("frontend/apps/main/components/site-motion.tsx");
  const staffMotion = read("frontend/apps/admin/components/site-motion.tsx");
  const publicLayout = read("frontend/apps/main/app/layout.tsx");
  const staffLayout = read("frontend/apps/admin/app/layout.tsx");
  const directoryLoading = read("frontend/apps/main/app/business-directory/directory-loading.tsx");
  const staffProtectedLoading = read("frontend/apps/admin/app/(protected)/loading.tsx");
  const publicCss = read("frontend/apps/main/app/globals.css");
  const staffCss = read("frontend/apps/admin/app/globals.css");

  assert.match(publicMotion, /TidegateSpinner/);
  assert.doesNotMatch(publicMotion, /IntersectionObserver|scrollReveal|has-scroll-reveal/);
  assert.doesNotMatch(staffMotion, /IntersectionObserver|scrollReveal|has-scroll-reveal/);
  assert.match(staffMotion, /TidegateSpinner/);
  assert.match(publicLayout, /<SiteMotion\s*\/>/);
  assert.doesNotMatch(staffLayout, /<SiteMotion\s*\/>/);
  assert.match(directoryLoading, /BusinessCardSkeleton/);
  assert.match(staffProtectedLoading, /TidegateSpinner/);
  assert.match(publicCss, /epe-tidegate-orbit/);
  assert.match(publicCss, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(publicCss, /has-scroll-reveal|data-scroll-reveal/);
  assert.match(staffCss, /epe-tidegate-orbit/);
  assert.doesNotMatch(staffCss, /has-scroll-reveal|data-scroll-reveal/);
  assert.match(staffCss, /prefers-reduced-motion:\s*reduce/);
});
