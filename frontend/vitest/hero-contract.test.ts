import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const heroCss = readFileSync(fileURLToPath(new URL("../apps/main/app/hero-logo.css", import.meta.url)), "utf8");
const homePage = readFileSync(fileURLToPath(new URL("../apps/main/app/page.tsx", import.meta.url)), "utf8");

function rule(selector: string) {
  const index = heroCss.indexOf(selector);
  if (index < 0) return "";
  const open = heroCss.indexOf("{", index);
  const close = heroCss.indexOf("}", open);
  return heroCss.slice(open + 1, close);
}

describe("public home hero", () => {
  it("renders the copy as four staggered title lines with a single CTA", () => {
    const titleLines = homePage.match(/home-hero__title-line/g) ?? [];
    expect(titleLines.length).toBeGreaterThanOrEqual(4);
    expect(homePage).toContain('className="home-hero__lede"');
    expect(homePage).toContain('href="/news" className="btn-primary"');
    expect(homePage).toContain("Read latest news");
  });

  it("centres the copy block vertically instead of pinning the CTA to the bottom", () => {
    const visual = rule(".home-hero__visual");
    const content = rule(".home-hero__content");
    const actions = rule(".home-hero__actions");

    expect(visual).toMatch(/display:\s*flex/);
    expect(visual).toMatch(/align-items:\s*center/);
    expect(visual).toMatch(/justify-content:\s*center/);
    expect(content).toMatch(/justify-content:\s*center/);
    expect(content).toMatch(/align-self:\s*center/);
    expect(actions).toMatch(/margin-top:\s*0/);
    expect(actions).not.toMatch(/margin-top:\s*auto/);
  });

  it("uses a fully rounded, white-text CTA", () => {
    const cta = rule(".home-hero__actions .btn-primary");
    expect(cta).toMatch(/border-radius:\s*999px/);
    expect(cta).toMatch(/color:\s*#fff/);
    expect(cta).toMatch(/min-height:\s*50px/);
  });

  it("stages title, lede and CTA without looping and respects reduced motion", () => {
    expect(heroCss).toMatch(/@keyframes\s+home-hero-line-in/);
    expect(heroCss).toMatch(/@keyframes\s+home-hero-copy-in/);
    for (const delay of ["90ms", "180ms", "270ms", "360ms"]) {
      expect(heroCss).toContain(`animation-delay:${delay}`);
    }
    expect(heroCss).toContain("500ms both");
    expect(heroCss).toContain("640ms both");
    expect(heroCss).not.toMatch(/animation:[^;}]*infinite/i);
    expect(heroCss).toMatch(/@media \(prefers-reduced-motion:reduce\)[\s\S]*?\.home-hero__title-line/);
  });
});
