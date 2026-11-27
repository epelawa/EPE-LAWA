#!/usr/bin/env node
/**
 * Full-page screenshots of redesigned public pages for the visual-review docs (turn 5).
 * Runs against the local smoke server + Supabase stub (synthetic data only), never production.
 *
 *   BASE_URL=http://127.0.0.1:3100 CHROMIUM_PATH=/path/to/chrome node scripts/page-screens.mjs
 *
 * SHOTS="name|/route|width|height|fixtureMode;..." overrides the default list.
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const FIXTURE = process.env.FIXTURE_URL ?? "http://localhost:54321";
const DEFAULT = [
  ["docs/radio-page/mobile-320-radio.png", "/radio", 320, 640, "empty"],
  ["docs/radio-page/mobile-390-radio.png", "/radio", 390, 844, "empty"],
  ["docs/radio-page/tablet-768-radio.png", "/radio", 768, 1024, "empty"],
  ["docs/radio-page/desktop-1440-radio.png", "/radio", 1440, 900, "empty"],
  ["docs/radio-page/mobile-390-radio-schedule-fixture.png", "/radio", 390, 844, "radio"],
  ["docs/business-radio-redesign/directory-320.png", "/business-directory", 320, 640, "directory"],
  ["docs/business-radio-redesign/directory-390.png", "/business-directory", 390, 844, "directory"],
  ["docs/business-radio-redesign/directory-768.png", "/business-directory", 768, 1024, "directory"],
  ["docs/business-radio-redesign/directory-1440.png", "/business-directory", 1440, 900, "directory"],
  ["docs/business-radio-redesign/directory-empty-390.png", "/business-directory", 390, 844, "empty"],
  ["docs/business-radio-redesign/profile-320.png", "/business-directory/fixture-business-1", 320, 640, "directory"],
  ["docs/business-radio-redesign/profile-390.png", "/business-directory/fixture-business-1", 390, 844, "directory"],
  ["docs/business-radio-redesign/profile-1440.png", "/business-directory/fixture-business-1", 1440, 900, "directory"],
  ["docs/business-radio-redesign/profile-long-name-390.png", "/business-directory/fixture-business-3", 390, 844, "directory"],
];
const shots = process.env.SHOTS ? process.env.SHOTS.split(";").map((s) => { const [n, r, w, h, m] = s.split("|"); return [n, r, Number(w), Number(h), m ?? "empty"]; }) : DEFAULT;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
const context = await browser.newContext({ reducedMotion: "reduce", ignoreHTTPSErrors: true });
await context.addInitScript(() => { try { localStorage.setItem("epelawa_cookie_consent", "true"); localStorage.setItem("epelawa-push-onboarding", "dismissed"); } catch { /* blocked */ } });
const page = await context.newPage();
let mode = "";
for (const [file, route, width, height, fixtureMode] of shots) {
  if (fixtureMode !== mode) { await fetch(`${FIXTURE}/__smoke__/mode`, { method: "POST", body: JSON.stringify({ mode: fixtureMode }) }); mode = fixtureMode; }
  await page.setViewportSize({ width, height });
  await page.goto(BASE + route, { waitUntil: "load", timeout: 120_000 });
  await page.waitForTimeout(700);
  mkdirSync(dirname(file), { recursive: true });
  await page.screenshot({ path: file, fullPage: true });
  console.log("shot", file);
}
await fetch(`${FIXTURE}/__smoke__/mode`, { method: "POST", body: JSON.stringify({ mode: "empty" }) });
await browser.close();
