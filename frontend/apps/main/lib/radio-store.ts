"use client";

import { useSyncExternalStore } from "react";
import { RADIO_LAGOS_1075 } from "./radio-lagos";
import { GUTS_FM_1049 } from "./radio-stations";

/**
 * One listening session for the whole public site.
 *
 * A single HTMLAudioElement is created lazily on the first press of Play, so no
 * stream is requested on page load and two players can never play at once. The
 * module outlives client-side navigation, which is what lets the mini-player keep
 * the same stream running from page to page without restarting it.
 */

export type StationId = "lagos" | "guts";
export type RadioStation = { id: StationId; name: string; frequency: string; streamUrl: string };
export type PlaybackStatus = "idle" | "connecting" | "playing" | "paused" | "slow" | "blocked" | "error" | "offline";
export type GutsLookupState = "unknown" | "loading" | "ready" | "not_found" | "unavailable";

export type RadioSnapshot = {
  stationId: StationId;
  status: PlaybackStatus;
  volume: number;
  muted: boolean;
  guts: { state: GutsLookupState; station: RadioStation | null };
  /** True once the listener has pressed Play in this tab; gates the mini-player. */
  started: boolean;
  /** The listener hid the mini-player; playback is unaffected. Reset by the next Play. */
  miniHidden: boolean;
};

export const LAGOS_STATION: RadioStation = {
  id: "lagos",
  name: RADIO_LAGOS_1075.name,
  frequency: RADIO_LAGOS_1075.frequency,
  streamUrl: RADIO_LAGOS_1075.streamUrl,
};
export const GUTS_LABEL = GUTS_FM_1049;

const SLOW_AFTER_MS = 8000;

let snapshot: RadioSnapshot = {
  stationId: "lagos",
  status: "idle",
  volume: 0.8,
  muted: false,
  guts: { state: "unknown", station: null },
  started: false,
  miniHidden: false,
};
const listeners = new Set<() => void>();
let audio: HTMLAudioElement | null = null;
let attempt = 0;
let slowTimer: number | undefined;
let gutsRequest: Promise<void> | null = null;

function set(patch: Partial<RadioSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
const getSnapshot = () => snapshot;
/** Current state outside React (tests, Media Session handlers). */
export const getRadioSnapshot = getSnapshot;
const getServerSnapshot = () => snapshot;

export function useRadio(): RadioSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function currentStation(state: RadioSnapshot = snapshot): RadioStation | null {
  return state.stationId === "lagos" ? LAGOS_STATION : state.guts.station;
}

export function isActive(status: PlaybackStatus) {
  return status === "playing" || status === "connecting" || status === "slow";
}

function clearSlowTimer() {
  if (slowTimer !== undefined) window.clearTimeout(slowTimer);
  slowTimer = undefined;
}

function armSlowTimer(id: number) {
  clearSlowTimer();
  slowTimer = window.setTimeout(() => {
    if (attempt === id && snapshot.status === "connecting") set({ status: "slow" });
  }, SLOW_AFTER_MS);
}

function ensureAudio(): HTMLAudioElement {
  if (audio) return audio;
  const element = new Audio();
  element.preload = "none";
  element.setAttribute("playsinline", "");
  element.volume = snapshot.volume;
  element.muted = snapshot.muted;
  // Only events that belong to an active attempt may change state, so a stale
  // error from a stream we already left can never overwrite the current one.
  element.addEventListener("playing", () => { clearSlowTimer(); if (isActive(snapshot.status)) set({ status: "playing" }); });
  element.addEventListener("waiting", () => { if (snapshot.status === "playing") { set({ status: "connecting" }); armSlowTimer(attempt); } });
  element.addEventListener("stalled", () => { if (isActive(snapshot.status)) set({ status: "slow" }); });
  element.addEventListener("error", () => {
    if (!isActive(snapshot.status)) return;
    clearSlowTimer();
    set({ status: navigator.onLine ? "error" : "offline" });
  });
  // Pauses that come from outside our controls (headset button, OS media controls).
  element.addEventListener("pause", () => { if (snapshot.status === "playing") { attempt++; release(); set({ status: "paused" }); } });
  window.addEventListener("offline", () => {
    if (!isActive(snapshot.status)) return;
    attempt++;
    set({ status: "offline" });
    release();
  });
  window.addEventListener("online", () => { if (snapshot.status === "offline") set({ status: "paused" }); });
  audio = element;
  return element;
}

/** Stop downloading a live stream: a paused live stream that keeps buffering wastes data. */
function release() {
  clearSlowTimer();
  if (!audio) return;
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
}

function updateMediaSession(station: RadioStation) {
  if (!("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${station.name} ${station.frequency}`,
      artist: "EPE LAWA Radio",
      artwork: [{ src: "/brand-logo.webp", sizes: "512x415", type: "image/webp" }],
    });
    navigator.mediaSession.setActionHandler("play", () => { void play(); });
    navigator.mediaSession.setActionHandler("pause", () => { pause(); });
  } catch { /* Media Session is optional */ }
}

/** Resolve the Guts FM stream through our server (the catalogue key never reaches the browser). */
export function lookupGuts(): Promise<void> {
  if (snapshot.guts.state === "ready" || snapshot.guts.state === "not_found") return Promise.resolve();
  if (gutsRequest) return gutsRequest;
  set({ guts: { state: "loading", station: null } });
  gutsRequest = fetch("/api/radio/guts")
    .then((response) => (response.ok ? response.json() : null))
    .then((data: { station?: { name: string; frequency: string; streamUrl: string } | null; reason?: string } | null) => {
      const station = data?.station;
      if (station?.streamUrl) set({ guts: { state: "ready", station: { id: "guts", name: GUTS_LABEL.name, frequency: station.frequency || GUTS_LABEL.frequency, streamUrl: station.streamUrl } } });
      else set({ guts: { state: data?.reason === "not_found" ? "not_found" : "unavailable", station: null } });
    })
    .catch(() => set({ guts: { state: "unavailable", station: null } }))
    .finally(() => { gutsRequest = null; });
  return gutsRequest;
}

export async function play(): Promise<void> {
  const id = ++attempt;
  if (!navigator.onLine) { set({ status: "offline" }); return; }
  if (snapshot.stationId === "guts" && snapshot.guts.state !== "ready") {
    set({ status: "connecting" });
    await lookupGuts();
    if (attempt !== id) return;
  }
  const station = currentStation();
  if (!station) { set({ status: "error" }); return; }
  if (!navigator.onLine) { set({ status: "offline" }); return; }
  const element = ensureAudio();
  // Always (re)attach the source: a live stream resumes at the live edge, not where it was paused.
  element.src = station.streamUrl;
  element.load();
  set({ status: "connecting", started: true, miniHidden: false });
  armSlowTimer(id);
  updateMediaSession(station);
  try {
    await element.play();
  } catch (error) {
    if (attempt !== id) return;
    clearSlowTimer();
    const denied = error instanceof DOMException && error.name === "NotAllowedError";
    set({ status: denied ? "blocked" : navigator.onLine ? "error" : "offline" });
    release();
  }
}

export function pause() {
  attempt++;
  set({ status: snapshot.started ? "paused" : "idle" });
  release();
}

export function toggle() {
  if (isActive(snapshot.status)) pause();
  else void play();
}

export function selectStation(id: StationId) {
  if (id === snapshot.stationId) return;
  const wasActive = isActive(snapshot.status);
  attempt++;
  set({ stationId: id, status: snapshot.started ? "paused" : "idle" });
  release();
  if (id === "guts") void lookupGuts();
  // Switching while listening carries straight on with the new station.
  if (wasActive) void play();
}

export function setVolume(value: number) {
  const volume = Math.min(1, Math.max(0, value));
  if (audio) { audio.volume = volume; if (volume > 0 && snapshot.muted) audio.muted = false; }
  set({ volume, muted: volume > 0 ? false : snapshot.muted });
}

export function toggleMute() {
  if (snapshot.volume === 0) { setVolume(0.8); return; }
  const muted = !snapshot.muted;
  if (audio) audio.muted = muted;
  set({ muted });
}

export function hideMiniPlayer() { set({ miniHidden: true }); }

/** Human status line; also announced to screen readers through a polite live region. */
export function statusMessage(state: RadioSnapshot): string {
  const station = currentStation(state);
  const label = station ? `${station.name} ${station.frequency}` : `${GUTS_LABEL.name} ${GUTS_LABEL.frequency}`;
  if (state.stationId === "guts" && state.guts.state === "loading") return "Looking up the Guts FM stream…";
  if (state.stationId === "guts" && (state.guts.state === "not_found" || state.guts.state === "unavailable") && !isActive(state.status)) {
    return "Guts FM is not available in this player right now. Try Radio Lagos, or try again later.";
  }
  switch (state.status) {
    case "connecting": return `Connecting to ${label}…`;
    case "slow": return "Still connecting. The station is slow to respond…";
    case "playing": return `Playing ${label}`;
    case "paused": return `Paused. Press Play to rejoin ${label} live.`;
    case "blocked": return "Your browser blocked playback. Press Play to start.";
    case "error": return `${label} is not responding right now. Try again in a moment.`;
    case "offline": return "Your device appears to be offline. Reconnect, then press Play.";
    default: return `Ready. Press Play to listen to ${label}.`;
  }
}

/** For tests only. */
export function __resetRadioForTests() {
  attempt = 0;
  audio = null;
  gutsRequest = null;
  clearSlowTimer();
  snapshot = { stationId: "lagos", status: "idle", volume: 0.8, muted: false, guts: { state: "unknown", station: null }, started: false, miniHidden: false };
  for (const listener of listeners) listener();
}
