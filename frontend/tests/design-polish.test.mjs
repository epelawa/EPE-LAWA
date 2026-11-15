import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("public reference navbar keeps the real brand and responsive secondary controls", () => {
  const theme = read("frontend/apps/main/components/theme-toggle.tsx");
  const header = read("frontend/apps/main/components/site-header.tsx");
  const brand = read("frontend/apps/main/components/brand.tsx");
  const staffBrand = read("frontend/apps/admin/components/brand.tsx");
  const footer = read("frontend/apps/main/components/site-footer.tsx");
  const home = read("frontend/apps/main/app/page.tsx");
  const heroCarousel = read("frontend/apps/main/components/hero-carousel.tsx");
  const css = read("frontend/apps/main/app/globals.css");
  const navigationCss = read("frontend/apps/main/components/navigation-refinement.css");
  const heroManifest = JSON.parse(read("frontend/apps/main/lib/hero-images.json"));
  const mastheadActions = header.match(/<div className="masthead-actions">([\s\S]*?)<\/div>/)?.[1] ?? "";

  assert.match(theme, /className="theme-control"/);
  assert.match(theme, /aria-pressed=\{theme === "dark"\}/);
  assert.match(theme, /theme-control__thumb/);
  assert.doesNotMatch(mastheadActions, /ThemeToggle/);
  assert.match(header, /className="nav-more__appearance" role="group" aria-label="Appearance settings"[\s\S]*<ThemeToggle \/>/);
  assert.match(header, /news-utilitybar/);
  assert.match(header, /aria-label="Main navigation"/);
  assert.match(header, /<details className="nav-more"/);
  assert.match(header, /<BrandLockup size=\{34\} \/>/);
  assert.match(navigationCss, /#063d2b/);
  assert.match(navigationCss, /overflow-x:auto/);
  assert.match(navigationCss, /min-height:44px/);
  assert.doesNotMatch(header, /site-head__menu|drawer-root|drawer-scrim|aria-modal|drawerOpen|A shared home for everyone/);
  assert.doesNotMatch(css + navigationCss, /\.site-head__menu|\.drawer-root|\.drawer-scrim/);
  assert.doesNotMatch(header + brand + staffBrand + footer, /Epe Division|brand__place|brand-lockup__tagline|showPlace/);
  assert.match(home, /<HeroCarousel\s*\/>/, "homepage logo hero exists");
  assert.doesNotMatch(home, /home-hero__brand|BrandLockup/);
  assert.match(home, /Epe\.<br \/><em>Closer to home\.<\/em>/);
  assert.match(home, /Stories, places and people that bring Epe together\./);
  assert.doesNotMatch(home, /Stories worth knowing|History worth keeping|Places worth finding|People worth connecting|home-topics/);
  assert.equal(heroManifest.length, 52);
  assert.equal(new Set(heroManifest.map((slide) => slide.source)).size, 52);
  assert.match(heroCarousel, /HERO_SLIDES = heroImages/);
  assert.doesNotMatch(heroCarousel, /Photo by \{slide\.author\}/);
  assert.doesNotMatch(heroCarousel, /Epe Division|The voice of Epe Division/i);
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

  for (const color of palette) {
    assert.ok(main.includes(color), `public app is missing ${color}`);
    assert.ok(admin.includes(color), `staff app is missing ${color}`);
    assert.ok(shared.includes(color), `shared tokens are missing ${color}`);
    assert.ok(statusPage.includes(color), `status page is missing ${color}`);
  }
  assert.match(main, /--primary: 218\.04 71\.16% 57\.84%;[\s\S]*?--primary-foreground: 225\.6 55\.56% 8\.82%;/);
  assert.match(main, /--link: 216\.92 79\.59% 80\.78%/);
  assert.match(admin, /--link: 220\.38 55\.91% 36\.47%/);
  assert.match(sharedCss, /var\(--primary-foreground,225\.6 55\.56% 8\.82%\)/);
  assert.match(main, /--ui-success: #26614a/);
  assert.match(main, /--ui-warning: #805d18/);
  assert.match(main, /--ui-danger: #a73545/);
  assert.doesNotMatch(main + admin + statusPage, /#(?:60436d|3f2b49|faf9f6|29242d|dbe8ad|c8c1cc|504955|6e6873|e4dee8)\b/i);
});

test("Tidegate loader and scroll blur are wired into public and staff routes", () => {
  const publicMotion = read("frontend/apps/main/components/site-motion.tsx");
  const staffMotion = read("frontend/apps/admin/components/site-motion.tsx");
  const publicLayout = read("frontend/apps/main/app/layout.tsx");
  const staffLayout = read("frontend/apps/admin/app/layout.tsx");
  const publicLoading = read("frontend/apps/main/app/loading.tsx");
  const staffProtectedLoading = read("frontend/apps/admin/app/(protected)/loading.tsx");
  const publicCss = read("frontend/apps/main/app/globals.css");
  const staffCss = read("frontend/apps/admin/app/globals.css");

  for (const motion of [publicMotion, staffMotion]) {
    assert.match(motion, /IntersectionObserver/);
    assert.match(motion, /prefers-reduced-motion/);
    assert.match(motion, /dataset\.scrollReveal = "pending"/);
    assert.match(motion, /element\.dataset\.scrollReveal === "visible" \|\| element\.closest/);
    assert.match(motion, /observer\.observe\(element\)/);
    assert.match(motion, /TidegateSpinner/);
  }
  for (const layout of [publicLayout, staffLayout]) assert.match(layout, /<SiteMotion\s*\/>/);
  for (const loading of [publicLoading, staffProtectedLoading]) assert.match(loading, /TidegateSpinner/);
  for (const css of [publicCss, staffCss]) {
    assert.match(css, /epe-tidegate-orbit/);
    assert.match(css, /filter:blur\(10px\)/);
    assert.match(css, /prefers-reduced-motion:\s*reduce/);
  }
});
