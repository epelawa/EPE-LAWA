import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const fontStyles = "@epelawa/ui/fonts.css";

test("public and staff apps use the same locally bundled Plus Jakarta Sans variable font", () => {
  const publicLayout = read("frontend/apps/main/app/layout.tsx");
  const staffLayout = read("frontend/apps/admin/app/layout.tsx");
  const publicCss = read("frontend/apps/main/app/globals.css");
  const authCss = read("frontend/apps/main/app/auth/auth.css");
  const staffCss = read("frontend/apps/admin/app/globals.css");
  const fontCss = read("frontend/packages/ui/src/fonts.css");

  for (const layout of [publicLayout, staffLayout]) {
    assert.ok(layout.includes(`import \"${fontStyles}\"`));
    assert.doesNotMatch(layout, /next\/font\/google/);
  }
  for (const subset of ["latin", "latin-ext", "vietnamese", "cyrillic-ext"]) {
    const filename = `plus-jakarta-sans-${subset}-wght-normal.woff2`;
    assert.ok(fontCss.includes(filename));
    assert.ok(fs.statSync(path.join(root, "frontend/packages/ui/src/fonts", filename)).size > 1000);
  }
  assert.match(fontCss, /font-display: swap/);
  assert.doesNotMatch(fontCss, /https?:|fonts\.googleapis|fonts\.gstatic/);
  assert.match(publicCss, /--font-ui-face:\s*\"Plus Jakarta Sans Variable\"/);
  assert.match(publicCss, /--font-body:\s*var\(--font-ui-face\)/);
  assert.match(staffCss, /font-family:\"Plus Jakarta Sans Variable\",ui-sans-serif/);
  assert.doesNotMatch(publicCss + authCss + staffCss, /fonts\.googleapis\.com|font-family:[^;}]*\b(?:Inter|Georgia|Times New Roman)\b/i);
});

test("both web apps distribute the upstream SIL OFL 1.1 font license", () => {
  const publicLicense = read("frontend/apps/main/public/licenses/plus-jakarta-sans-OFL.txt");
  const staffLicense = read("frontend/apps/admin/public/licenses/plus-jakarta-sans-OFL.txt");

  assert.equal(publicLicense, staffLicense);
  assert.match(publicLicense, /Copyright 2020 The Plus Jakarta Sans Project Authors/);
  assert.match(publicLicense, /SIL OPEN FONT LICENSE Version 1\.1/);
  assert.match(publicLicense, /provided that each copy\s+contains the above copyright notice and this license/);
});
