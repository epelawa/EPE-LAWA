import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const component = await readFile(new URL("../apps/main/components/radio-player.tsx", import.meta.url), "utf8");
test("player exposes switching, playback and connection states", () => {
  for (const expression of [/aria-pressed/, /audioRef\.current\?\.pause\(\)/, /onPlaying/, /onWaiting/, /onStalled/, /onError/, /NotAllowedError/, /navigator\.onLine/, /window\.addEventListener\("offline"/, /audio\.load\(\)/, /audio\.volume=volume/, /audio\.muted=muted/]) assert.match(component, expression);
  assert.doesNotMatch(component, /autoPlay|NAIJA_RADIO_API_KEY/);
});
