// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onAirSlotId, toMinutes } from "../apps/main/app/radio/programmes/on-air";

// Turn 5: one shared listening session. These tests drive the real store with a fake
// HTMLAudioElement; no network stream is touched.
class FakeAudio extends EventTarget {
  static instances: FakeAudio[] = [];
  preload = "auto"; volume = 1; muted = false; paused = true; srcValue = ""; loads = 0;
  playImpl: () => Promise<void> = async () => { this.paused = false; this.dispatchEvent(new Event("playing")); };
  constructor() { super(); FakeAudio.instances.push(this); }
  get src() { return this.srcValue; }
  set src(value: string) { this.srcValue = value; }
  setAttribute() {}
  removeAttribute(name: string) { if (name === "src") this.srcValue = ""; }
  load() { this.loads++; }
  play() { return this.playImpl(); }
  pause() { if (!this.paused) { this.paused = true; this.dispatchEvent(new Event("pause")); } }
}

let store: typeof import("../apps/main/lib/radio-store");
beforeEach(async () => {
  FakeAudio.instances = [];
  vi.stubGlobal("Audio", FakeAudio);
  Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true });
  vi.resetModules();
  store = await import("../apps/main/lib/radio-store");
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("radio store", () => {
  it("creates no audio element and requests no stream until Play is pressed", () => {
    expect(FakeAudio.instances).toHaveLength(0);
    store.selectStation("lagos");
    store.setVolume(0.5);
    expect(FakeAudio.instances).toHaveLength(0);
  });

  it("plays one stream through one element, reports Live honestly and releases the stream on pause", async () => {
    await store.play();
    expect(FakeAudio.instances).toHaveLength(1);
    const audio = FakeAudio.instances[0];
    expect(audio.preload).toBe("none");
    expect(audio.src).toBe(store.LAGOS_STATION.streamUrl);
    expect(store.getRadioSnapshot().status).toBe("playing");
    expect(store.statusMessage(store.getRadioSnapshot())).toMatch(/^Playing Radio Lagos 107\.5 FM/);
    store.pause();
    expect(audio.src).toBe("");
    await store.play();
    expect(FakeAudio.instances).toHaveLength(1);
  });

  it("maps a browser autoplay refusal to a tap-to-play state, not an error", async () => {
    await store.play();
    store.pause();
    expect(store.getRadioSnapshot().status).toBe("paused");
    FakeAudio.instances[0].playImpl = async () => { throw new DOMException("blocked", "NotAllowedError"); };
    await store.play();
    expect(store.getRadioSnapshot().status).toBe("blocked");
    expect(store.statusMessage(store.getRadioSnapshot())).toMatch(/Press Play to start/);
  });

  it("reports an unreachable stream as an error with a retry message, and offline separately", async () => {
    await store.play();
    store.pause();
    FakeAudio.instances[0].playImpl = async () => { throw new DOMException("network", "NotSupportedError"); };
    await store.play();
    expect(store.getRadioSnapshot().status).toBe("error");
    expect(store.statusMessage(store.getRadioSnapshot())).toMatch(/not responding/);
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
    await store.play();
    expect(store.getRadioSnapshot().status).toBe("offline");
  });

  it("plays the Guts FM source directly after a station is selected and Play is pressed", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    store.selectStation("guts");
    expect(FakeAudio.instances).toHaveLength(0);

    await store.play();

    expect(fetch).not.toHaveBeenCalled();
    expect(FakeAudio.instances[0].src).toBe(store.GUTS_STATION.streamUrl);
    expect(store.statusMessage(store.getRadioSnapshot())).toBe("Playing Guts FM 104.9 FM");
    store.selectStation("lagos");
    expect(FakeAudio.instances).toHaveLength(1);
    expect(FakeAudio.instances[0].src).toBe(store.LAGOS_STATION.streamUrl);
    store.pause();
  });

  it("keeps playback paused when a cancelled audio request later rejects", async () => {
    await store.play();
    store.pause();
    const audio = FakeAudio.instances[0];
    let reject!: (reason: Error) => void;
    audio.playImpl = () => new Promise<void>((_, fail) => { reject = fail; });

    store.selectStation("guts");
    const playing = store.play();
    store.pause();
    reject(new DOMException("Playback cancelled", "AbortError"));
    await playing;

    expect(store.getRadioSnapshot().status).toBe("paused");
    expect(audio.src).toBe("");
  });

  it("hiding the mini-player never stops playback", async () => {
    await store.play();
    const audio = FakeAudio.instances[0];
    store.hideMiniPlayer();
    expect(store.getRadioSnapshot().miniHidden).toBe(true);
    expect(audio.paused).toBe(false);
    expect(audio.src).toBe(store.LAGOS_STATION.streamUrl);
    store.pause();
    await store.play();
    expect(store.getRadioSnapshot().miniHidden).toBe(false);
  });
});

describe("on-air matching", () => {
  it("accepts Postgres HH:MM:SS times as well as HH:MM", () => {
    expect(toMinutes("13:30:00")).toBe(810);
    expect(toMinutes("13:30")).toBe(810);
    expect(toMinutes("25:00")).toBeNull();
  });
  it("finds the slot on air in Lagos time from database-shaped rows", () => {
    // Thursday 2026-11-26 13:45 WAT = 12:45 UTC.
    const now = new Date("2026-11-26T12:45:00Z");
    expect(onAirSlotId([{ id: "a", day_of_week: 4, starts_at: "13:30:00", ends_at: "14:30:00" }], now)).toBe("a");
    expect(onAirSlotId([{ id: "a", day_of_week: 4, starts_at: "14:00:00", ends_at: "15:00:00" }], now)).toBeNull();
  });
});
