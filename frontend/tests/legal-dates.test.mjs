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
    // Each page carries its own revision date; it must be a real date no older than the
    // 12 November 2026 legal baseline (Privacy was revised on 26 November 2026).
    const updated = source.match(/Last updated:<\/strong> (\d{1,2} [A-Z][a-z]+ \d{4})</);
    assert.ok(updated, `${title} should show a "Last updated" date`);
    const when = new Date(`${updated[1]} UTC`);
    assert.ok(!Number.isNaN(when.getTime()), `${title} date should parse`);
    assert.ok(when >= new Date("12 November 2026 UTC"), `${title} date should not predate the legal baseline`);
    assert.match(source, new RegExp(`title: "${title}"`));
    assert.match(source, new RegExp(`path: "${pathName}"`));
  }
});
