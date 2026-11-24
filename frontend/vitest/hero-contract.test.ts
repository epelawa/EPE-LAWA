import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
const home = readFileSync(fileURLToPath(new URL("../apps/main/app/page.tsx", import.meta.url)), "utf8");
const css = readFileSync(fileURLToPath(new URL("../apps/main/app/home-client-refresh.css", import.meta.url)), "utf8");
describe("community home", () => {
  it("links to real sections and reads published stories", () => {
    expect(home).toContain("home.title.line1");
    expect(home).toContain("getLatestStories(3)");
    expect(home).toContain('aria-label="Explore EPE LAWA"');
    expect(home).toContain('href="/radio"');
    expect(home).not.toContain("On Air: Good Morning Epe");
  });
  it("adapts the compact layout and respects reduced motion", () => {
    expect(css).toContain("@media (max-width: 700px)");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
  it("keeps the hero inset with the dark panel, yellow strapline and outlined CTA", () => {
    expect(css).toMatch(/\.home-hero\s*\{[^}]*width:\s*min\(var\(--content-max\),\s*calc\(100%\s*-\s*var\(--gutter\)\s*\*\s*2\)\)/);
    expect(css).toMatch(/\.home-hero__media::after\s*\{[^}]*linear-gradient\(112deg/);
    expect(css).toMatch(/\.home-hero__lede\s*\{[^}]*background:\s*#ffdb29/);
    expect(css).toMatch(/\.home-hero__actions\s*\{[^}]*justify-content:\s*center/);
    expect(css).not.toMatch(/\.home-hero__content\s*\{[^}]*width:\s*100%\s*!important/);
  });
});
