import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../apps/main/app/globals.css", import.meta.url), "utf8");
const authCss = await readFile(new URL("../apps/main/app/auth/auth.css", import.meta.url), "utf8");
const layout = await readFile(new URL("../apps/main/app/layout.tsx", import.meta.url), "utf8");
const theme = await readFile(new URL("../apps/main/lib/theme.ts", import.meta.url), "utf8");

const linework = /linear-gradient\(135deg, transparent 49\.85%, rgb\(71 127 224 \/ 0\.025\) 50%, transparent 50\.15%\)[\s\S]*linear-gradient\(45deg, transparent 49\.9%, rgb\(41 75 145 \/ 0\.018\) 50%, transparent 50\.1%\)/;

 test("the sitewide canvas is permanently light and uses a static blue atmosphere", () => {
  const lightBody = css.match(/html\[data-theme="light"\]\s+body\s*\{([^}]*)\}/)?.[1];
  assert.ok(lightBody, "the light body canvas rule exists");
  assert.match(lightBody, /radial-gradient\(ellipse 55% 340px/);
  assert.match(lightBody, /background-size:\s*100% 100%/);
  assert.match(lightBody, /background-repeat:\s*no-repeat/);
  assert.doesNotMatch(lightBody, /position:|z-index:|pointer-events:|animation|transition/);
  assert.match(css, /:root\s*\{[\s\S]*color-scheme:\s*light/);
  assert.doesNotMatch(css, /data-theme="dark"|color-scheme:\s*dark/);
  assert.match(layout, /<html\b/);
  assert.match(layout, /data-theme="light"/);
  assert.match(layout, /colorScheme: "light"/);
  assert.match(theme, /dataset\.theme="light"/);
  assert.match(theme, /style\.colorScheme="light"/);
});

test("the account page keeps the original light linework treatment", () => {
  const authPage = [...authCss.matchAll(/\.auth-page\s*\{([^}]*)\}/g)].map((match) => match[1]).find((block) => block.includes("background-image"));
  assert.ok(authPage, "the account page canvas rule exists");
  assert.match(authPage, /background-color:\s*var\(--palette-cloud\)/);
  assert.match(authPage, linework);
  assert.match(authPage, /background-size:\s*152px 152px, 228px 228px/);
  assert.doesNotMatch(authPage, /data-theme="dark"|color-scheme:\s*dark/);
});
