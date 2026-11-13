import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Forum and Radio landing pages use shared canonical/social metadata", () => {
  const forum = read("frontend/apps/main/app/forum/page.tsx");
  const radio = read("frontend/apps/main/app/radio/page.tsx");
  for (const [source, title, pathName] of [[forum, "Forum", "/forum"], [radio, "EPE LAWA Radio", "/radio"]]) {
    assert.match(source, /pageMetadata/);
    assert.match(source, new RegExp(`title: "${title}"`));
    assert.match(source, new RegExp(`path: "${pathName}"`));
    assert.match(source, /description: "[^"]{40,}"/);
    assert.match(source, /export const metadata/);
  }
});
