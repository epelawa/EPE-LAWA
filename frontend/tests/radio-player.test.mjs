import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const component = await readFile(new URL("../apps/main/components/radio-player.tsx", import.meta.url), "utf8");
const catalog = await readFile(new URL("../apps/main/lib/radio-lagos.ts", import.meta.url), "utf8");

test("audio element receives the displayed volume and mute state", () => {
  const volumeSync = component.indexOf("audio.volume = volume;");
  const autoplay = component.indexOf("// Try playback when the route mounts.");
  assert.ok(volumeSync >= 0 && autoplay >= 0 && volumeSync < autoplay);
  assert.match(component, /audio\.muted = muted;/);
});

test("resuming reconnects to the stream rather than playing a paused buffer", () => {
  const toggle = component.slice(component.indexOf("async function togglePlayback"), component.indexOf("function changeVolume"));
  assert.ok(toggle.indexOf("audio.load()") > toggle.indexOf("audio.pause()"));
  assert.ok(toggle.indexOf("audio.load()") < toggle.indexOf("await audio.play()"));
});

test("playback denial is surfaced as a tap-to-play fallback", () => {
  assert.match(component, /<audio[\s\S]*autoPlay[\s\S]*playsInline/);
  assert.match(component, /error\.name === "NotAllowedError"/);
  assert.match(component, /setState\(isAutoplayDenial\(error\) \? "blocked" : "unavailable"\)/);
  assert.match(component, /Your browser blocked automatic playback\. Tap Play to listen\./);
  assert.match(component, /Press the Play button to start listening\./);
});

test("media stream errors become unavailable and offer only the catalog listen link", () => {
  assert.match(component, /onError=\{\(\) => setState\("unavailable"\)\}/);
  assert.match(component, /The station stream is unavailable right now/);
  assert.match(component, /RADIO_LAGOS_1075\.listenUrl/);
  assert.match(catalog, /https:\/\/azstream\.elektranbroadcast\.com\/listen\/radiolagos1075\/radio\.mp3/);
  assert.match(catalog, /https:\/\/fm\.puzzofme\.com\/\?station=radio-lagos/);
  assert.doesNotMatch(component, /puzzofme\.com\/\?station=radio-lagos/);
});
