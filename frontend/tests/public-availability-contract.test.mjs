import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("public Radio keeps direct Lagos stream and honest programme status", () => {
 const player = read("frontend/apps/main/components/radio-player.tsx");
 const station = read("frontend/apps/main/lib/radio-lagos.ts");
 const programmes = read("frontend/apps/main/app/radio/programmes/page.tsx");
 assert.match(programmes, /Programme information is unavailable/);
 assert.match(station, /https:\/\/azstream\.elektranbroadcast\.com\/listen\/radiolagos1075\/radio\.mp3/);
 // Turn 5: playback moved into lib/radio-store.ts (shared with the site-wide mini-player).
 const store = read("frontend/apps/main/lib/radio-store.ts");
 assert.match(store, /element\.preload = "none"/); assert.match(store, /addEventListener\("playing"/);
 assert.match(store, /is not responding right now\. Try again in a moment\./);
 assert.match(player, /statusMessage\(radio\)/);
 assert.doesNotMatch(player + store, /<iframe/i);
});

test("public Tourism has distinct read-failure, empty, and unverified-detail states", () => {
  const index = read("frontend/apps/main/app/tourism/page.tsx");
  const detail = read("frontend/apps/main/app/tourism/[slug]/page.tsx");
  assert.match(index, /Destinations could not be loaded/);
  assert.match(index, /No approved destinations yet/);
  assert.match(detail, /Destination not found/);
  assert.match(detail, /Not verified \/ not provided/);
  assert.doesNotMatch(index + detail, /sample destination|invented attraction|made-up landmark/i);
});

test("Who-is-Who fails closed when public profiles are not configured", () => {
  const page = read("frontend/apps/main/app/who-is-who/page.tsx");
  assert.match(page, /The directory is not configured/);
  assert.match(page, /No profile information is being guessed/);
  assert.match(page, /public profiles/);
  assert.doesNotMatch(page, /seeded profile|sample person|placeholder person/i);
});
