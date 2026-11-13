import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("public Radio keeps stream availability explicitly unverified", () => {
  const page = read("frontend/apps/main/app/radio/page.tsx");
  const player = read("frontend/apps/main/components/radio-player.tsx");
  assert.match(page, /Live stream not yet available/);
  assert.match(page, /stream has not been verified/);
  assert.match(page, /no live status is claimed/);
  assert.match(player, /Live streaming is unavailable/);
  assert.doesNotMatch(player, /Radio Lagos|azstream\.elektranbroadcast\.com|puzzofme/i);
  assert.doesNotMatch(player, /<iframe|<audio[^>]+src=/i);
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
