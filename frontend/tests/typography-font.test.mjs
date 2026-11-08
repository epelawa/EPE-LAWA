import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const fontPackage = "@fontsource-variable/plus-jakarta-sans";

test("public and staff apps use the same locally bundled Plus Jakarta Sans variable font", () => {
  const publicLayout = read("frontend/apps/main/app/layout.tsx");
  const staffLayout = read("frontend/apps/admin/app/layout.tsx");
  const publicCss = read("frontend/apps/main/app/globals.css");
  const authCss = read("frontend/apps/main/app/auth/auth.css");
  const staffCss = read("frontend/apps/admin/app/globals.css");
  const publicPackage = JSON.parse(read("frontend/apps/main/package.json"));
  const staffPackage = JSON.parse(read("frontend/apps/admin/package.json"));

  for (const layout of [publicLayout, staffLayout]) {
    assert.ok(layout.includes(`import \"${fontPackage}\"`));
    assert.doesNotMatch(layout, /next\/font\/google/);
  }
  assert.equal(publicPackage.dependencies[fontPackage], "5.3.0");
  assert.equal(staffPackage.dependencies[fontPackage], "5.3.0");
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
