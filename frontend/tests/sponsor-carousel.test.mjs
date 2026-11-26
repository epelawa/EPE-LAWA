import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);

function repoFile(relative) {
  const fileUrl = new URL(`../../${relative}`, import.meta.url);
  return readFileSync(fileUrl, "utf8");
}

const slot = repoFile("frontend/apps/main/components/sponsor-slot.tsx");
const carousel = repoFile("frontend/apps/main/components/sponsor-carousel.tsx");
const slotStyles = repoFile("frontend/apps/main/components/sponsor-slot.module.css");

test("sponsor slots are driven by the staff ads line-up, not the dead payment view", () => {
  assert.match(slot, /from\("business_ad_carousel"\)/);
  assert.match(slot, /\.order\("position", \{ ascending: true \}\)/);
  assert.doesNotMatch(slot, /active_business_sponsorships/);
  assert.match(slot, /logoDisplayUrl\(row\.logo_key\)/);
});

test("one selected business renders inline; several render the carousel", () => {
  assert.match(slot, /sponsors\.length > 1 \? \(\s*<SponsorCarousel sponsors=\{sponsors\} compact=\{compact\} \/>/);
  assert.match(slot, /sponsors\.length === 1 \? \(\s*<SponsorLink sponsor=\{sponsors\[0\]\} \/>/);
  assert.match(slot, /Patronise this local business/);
});

test("the empty state invite survives when staff select nothing", () => {
  assert.match(slot, /Advertise here/);
  assert.match(slot, /Put your business in the spotlight\./);
  assert.match(slot, /Advertise with EPE LAWA/);
});

test("the sponsor carousel rotates on its own and stays in the reader's hands", () => {
  assert.match(carousel, /"use client"/);
  assert.match(carousel, /aria-roledescription="carousel"/);
  assert.match(carousel, /INTERVAL_MS = \d+/);
  assert.match(carousel, /prefers-reduced-motion: reduce/);
  assert.match(carousel, /setPaused\(true\)/);
  assert.match(carousel, /touchStart/);
  assert.match(carousel, /aria-label="Previous business"/);
  assert.match(carousel, /aria-label="Next business"/);
  assert.match(carousel, /aria-label=\{`Show \$\{sponsor\.name\}`\}/);
  assert.match(carousel, /tabIndex=\{index === active \? 0 : -1\}/);
  assert.doesNotMatch(carousel, /href=\/advertise/);
});

test("carousel slides reuse the sponsorship card, with a track the code must own", () => {
  for (const cls of ["carouselWindow", "carouselTrack", "carouselSlide", "carouselControls", "carouselDot", "carouselDotActive", "logo", "logoFallback"]) {
    assert.match(slotStyles, new RegExp(`\\.${cls}\\s*\\{`), `.${cls} must exist`);
    assert.match(carousel, new RegExp(`styles\\.${cls}\\b`), `sponsor-carousel.tsx must use .${cls}`);
  }
  assert.match(carousel, /translateX\(-\$\{active \* 100\}%\)/);
});

test("reduced-motion swaps the animated track for native swipe", () => {
  const reduced = slotStyles.split("@media (prefers-reduced-motion: reduce)").pop() ?? "";
  assert.match(reduced, /\.carouselTrack \{ transition: none !important; \}/);
  assert.match(reduced, /overflow-x: auto/);
  assert.match(reduced, /scroll-snap-type: x mandatory/);
});

test("the homepage no longer mounts advertising placements", () => {
  const homepage = repoFile("frontend/apps/main/app/page.tsx");
  assert.doesNotMatch(homepage, /AdsSection/);
  assert.doesNotMatch(homepage, /<SponsorSlot/);
});
