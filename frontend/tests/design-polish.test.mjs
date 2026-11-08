import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("navbar has a distinct theme switch, concise brand lockup, and outside-close drawer", () => {
  const theme = read("frontend/apps/main/components/theme-toggle.tsx");
  const header = read("frontend/apps/main/components/site-header.tsx");
  const brand = read("frontend/apps/main/components/brand.tsx");
  const css = read("frontend/apps/main/app/globals.css");

  assert.match(theme, /className="theme-control"/);
  assert.match(theme, /aria-pressed=\{theme === "dark"\}/);
  assert.match(theme, /theme-control__thumb/);
  assert.match(header, /<BrandLockup size=\{30\} showPlace=\{false\} \/>/);
  assert.match(brand, /showPlace\s*\?\s*<span className="brand__place">Epe Division<\/span> : null/);
  assert.match(header, /addEventListener\("pointerdown", onOutsideDrawer\)/);
  assert.match(css, /width: min\(215px,max\(150px,calc\(50vw - 10px\)\)\)/);
  assert.match(css, /\.drawer-account \{ flex-direction: column;/);
});

test("editorial dot decorations are gone and footer links stay split on mobile", () => {
  const css = read("frontend/apps/main/app/globals.css");
  assert.doesNotMatch(css, /\.ui-eyebrow::before|\.home-topics span::before/);
  assert.match(css, /\.footer-columns \{ grid-template-columns: repeat\(2,minmax\(0,1fr\)\); gap: 16px;/);
});
