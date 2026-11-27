import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const component = await readFile(new URL("../apps/main/components/radio-player.tsx", import.meta.url), "utf8");
const store = await readFile(new URL("../apps/main/lib/radio-store.ts", import.meta.url), "utf8");
const mini = await readFile(new URL("../apps/main/components/radio-mini-player.tsx", import.meta.url), "utf8");
const layout = await readFile(new URL("../apps/main/app/layout.tsx", import.meta.url), "utf8");

// Turn 5 redesign: the playback engine moved from the component into lib/radio-store.ts so one
// stream can continue in the site-wide mini-player. The same behaviours are asserted there.
test("player exposes switching, playback and connection states", () => {
  assert.match(component, /aria-pressed/);
  assert.match(component, /role="status" aria-live="polite"/);
  for (const expression of [/addEventListener\("playing"/, /addEventListener\("waiting"/, /addEventListener\("stalled"/, /addEventListener\("error"/, /NotAllowedError/, /navigator\.onLine/, /window\.addEventListener\("offline"/, /element\.load\(\)/, /audio\.volume = volume/, /audio\.muted = muted/]) assert.match(store, expression);
  assert.doesNotMatch(component + store + mini, /autoPlay|autoplay=|NAIJA_RADIO_API_KEY/);
});

test("no stream is requested before Play and only one audio element ever exists", () => {
  assert.match(store, /element\.preload = "none"/);
  assert.equal((store.match(/new Audio\(\)/g) ?? []).length, 1);
  assert.match(store, /if \(audio\) return audio;/);
  assert.doesNotMatch(component + mini, /<audio|new Audio/);
  // "Live" is shown only while audio is actually playing.
  assert.match(component, /playing \? "Live"/);
});

test("the mini-player persists across public routes but not on /radio or in admin", () => {
  assert.match(layout, /<RadioMiniPlayer \/>/);
  assert.match(mini, /pathname === "\/radio" \|\| pathname\.startsWith\("\/admin"\)/);
  assert.match(mini, /hideMiniPlayer\(\)/);
  assert.match(mini, /href="\/radio"/);
  assert.match(mini, /keeps playing/);
});
