import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
const home = readFileSync(fileURLToPath(new URL("../apps/main/app/page.tsx", import.meta.url)), "utf8");
const css = readFileSync(fileURLToPath(new URL("../apps/main/app/home-client-refresh.css", import.meta.url)), "utf8");
describe("community home", () => {
  it("links to real sections and reads published stories", () => {
    expect(home).toContain("Epe Lawa: Connecting");
    expect(home).toContain("getLatestStories(7)");
    expect(home).toContain('aria-label="Explore EPE LAWA"');
    expect(home).toContain('href="/radio"');
    expect(home).not.toContain("On Air: Good Morning Epe");
  });
  it("adapts the compact layout and respects reduced motion", () => {
    expect(css).toContain("@media (max-width: 700px)");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
});
