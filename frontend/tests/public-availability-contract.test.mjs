import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("public Radio exposes only the verified Radio Lagos 107.5 player and honest programme status", () => {
  const page = read("frontend/apps/main/app/radio/page.tsx");
  const player = read("frontend/apps/main/components/radio-player.tsx");
  const station = read("frontend/apps/main/lib/radio-lagos.ts");
  assert.match(page, /Radio Lagos.*107\.5 FM/);
  const programmes = read("frontend/apps/main/app/radio/programmes/page.tsx");
  assert.match(programmes, /Programme information is unavailable/);
  assert.match(page, /href="\/radio\/programmes"/);
  assert.doesNotMatch(page, /stream has not been verified|no live status is claimed/i);
  assert.match(station, /id: "nr_7c1cfbb5-f2f3-446c-a5e4-2f417a5d949b"/);
  assert.match(station, /streamUrl: "https:\/\/azstream\.elektranbroadcast\.com\/listen\/radiolagos1075\/radio\.mp3"/);
  assert.match(station, /listenUrl: "https:\/\/fm\.puzzofme\.com\/\?station=radio-lagos"/);
  assert.match(player, /<audio[\s\S]*?preload="none"[\s\S]*?src=\{RADIO_LAGOS_1075\.streamUrl\}/);
  assert.match(player, /onPlaying=\{\(\) => setState\("playing"\)\}/);
  assert.match(player, /onError=\{\(\) => setState\("unavailable"\)\}/);
  assert.match(player, /Your browser blocked automatic playback/);
  assert.match(player, /Open Radio Lagos listen page/);
  assert.match(player, /onChange=\{\(event\) => changeVolume\(Number\(event\.target\.value\)\)\}/);
  assert.doesNotMatch(player, /<audio[^>]*\bcontrols\b/i);
  assert.doesNotMatch(player, /<iframe/i);
  assert.match(player, /playing: "Live stream connected · audio is playing"/);
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
