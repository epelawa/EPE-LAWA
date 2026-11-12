import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Terms and Privacy pages expose a current last-updated date", () => {
  for (const [file, title, pathName] of [
    ["frontend/apps/main/app/terms/page.tsx", "Terms", "/terms"],
    ["frontend/apps/main/app/privacy/page.tsx", "Privacy", "/privacy"],
  ]) {
    const source = read(file);
    assert.match(source, /Last updated:<\/strong> 12 November 2026/);
    assert.match(source, new RegExp(`title: "${title}"`));
    assert.match(source, new RegExp(`path: "${pathName}"`));
  }
});
