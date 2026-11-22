import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("app CTA reports real availability without inventing a store listing or waitlist", () => {
  const full = read("frontend/apps/main/components/download-app.tsx");
  const compact = read("frontend/apps/main/components/download-app-button.tsx");
  const requirements = read("docs/00-master-plan.md");

  for (const source of [full, compact]) {
    assert.match(source, /Not on Play Store/);
    assert.match(source, /no downloadable Android app or Google Play listing/i);
    assert.match(source, /native\s+mobile app is deferred/i);
    assert.match(source, /Continue on the web/);
    assert.doesNotMatch(source, /play\.google\.com\/store|apps\.apple\.com|success|You’re on the list|waitlist/i);
  }
  assert.match(requirements, /real store availability/i);
  assert.match(requirements, /Never report a waitlist success unless a verified persistent storage route saves the submission/i);
});
