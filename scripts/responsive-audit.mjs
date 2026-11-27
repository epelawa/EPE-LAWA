#!/usr/bin/env node
/**
 * Responsive audit for the public site (turn 5).
 *
 * Loads every public route at every viewport in the owner's matrix (turn-5 matrix plus 412px from the
 * directory/radio redesign brief) and records:
 *   - document overflow  (documentElement.scrollWidth > clientWidth)
 *   - element overflow   (a visible element extends past the viewport and no ancestor clips
 *                         or scrolls it horizontally, so the visitor can actually see the bleed)
 *   - fixed overlap      (two visible position:fixed controls intersect)
 *   - small targets      (visible interactive elements under 24x24 CSS px: WCAG 2.2 SC 2.5.8 floor)
 *
 * Usage: BASE_URL=http://127.0.0.1:3100 CHROMIUM_PATH=/path/to/chrome node scripts/responsive-audit.mjs [out.json]
 * It is a measurement tool, not a pass/fail gate; the Playwright smoke suite holds the gates.
 */
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const OUT = process.argv[2] ?? "responsive-audit.json";
export const VIEWPORTS = [
  [320, 568], [320, 640], [360, 740], [360, 800], [375, 812], [390, 844], [412, 915], [414, 896], [430, 932],
  [640, 360], [740, 360], [844, 390],
  [600, 960], [768, 1024], [820, 1180], [1024, 768],
  [1280, 720], [1366, 768], [1440, 900], [1536, 864], [1920, 1080], [2560, 1440],
];
export const ROUTES = (process.env.ROUTES ?? [
  "/", "/news", "/about", "/advertise", "/contact", "/support", "/business-directory", "/business-directory/submit",
  "/events", "/forum", "/gallery", "/guidelines", "/itan-ilu-mi", "/itan-ilu-mi/correction", "/map", "/photo-credits",
  "/privacy", "/terms", "/radio", "/radio/programmes", "/radio/reminders", "/tourism", "/who-is-who", "/newsletter",
  "/login", "/forgot-password", "/business-directory/fixture-business-1", "/business-directory/fixture-business-3",
].join(",")).split(",");

function inspect() {
  const vw = document.documentElement.clientWidth;
  const doc = { scrollWidth: document.documentElement.scrollWidth, clientWidth: vw };
  const describe = (el) => {
    const id = el.id ? `#${el.id}` : "";
    const cls = typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
    return `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 90);
  };
  const clipped = (el) => {
    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (/(hidden|auto|scroll|clip)/.test(style.overflowX)) {
        const rect = node.getBoundingClientRect();
        if (rect.right <= vw + 1 && rect.left >= -1) return true;
      }
    }
    return false;
  };
  const visible = (el, rect) => {
    if (rect.width < 1 || rect.height < 1) return false;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) return false;
    if (style.clip === "rect(0px, 0px, 0px, 0px)" || style.clipPath === "inset(50%)") return false;
    if (el.closest("[aria-hidden='true'],[hidden],dialog:not([open]),.drawer-root:not([data-open='true'])")) return false;
    return true;
  };
  const overflow = [];
  for (const el of document.body.querySelectorAll("*")) {
    const rect = el.getBoundingClientRect();
    if (rect.right <= vw + 1 && rect.left >= -1) continue;
    if (!visible(el, rect) || clipped(el)) continue;
    overflow.push({ el: describe(el), left: Math.round(rect.left), right: Math.round(rect.right) });
    if (overflow.length >= 8) break;
  }
  const fixed = [...document.body.querySelectorAll("*")].filter((el) => {
    const style = getComputedStyle(el);
    if (style.position !== "fixed") return false;
    const rect = el.getBoundingClientRect();
    return visible(el, rect) && rect.width < vw * 0.98 + 400 && !el.matches(".site-preloader,.skip-link,.drawer-root,.toast-region,.mobile-bottom-nav *");
  }).map((el) => ({ el: describe(el), rect: el.getBoundingClientRect().toJSON() }));
  const overlaps = [];
  for (let i = 0; i < fixed.length; i++) for (let j = i + 1; j < fixed.length; j++) {
    const a = fixed[i].rect, b = fixed[j].rect;
    if (fixed[i].el === fixed[j].el) continue;
    const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (ix > 2 && iy > 2) overlaps.push(`${fixed[i].el} × ${fixed[j].el}`);
  }
  const small = [];
  for (const el of document.querySelectorAll("main a[href], main button, main input:not([type=hidden]), main select, main summary")) {
    const rect = el.getBoundingClientRect();
    if (!visible(el, rect)) continue;
    // Inline links inside running text are exempt under SC 2.5.8.
    if (el.tagName === "A" && getComputedStyle(el).display === "inline") continue;
    if (rect.width < 24 || rect.height < 24) small.push(`${describe(el)} ${Math.round(rect.width)}x${Math.round(rect.height)}`);
    if (small.length >= 6) break;
  }
  return { doc, overflow, overlaps, small };
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
const context = await browser.newContext({ reducedMotion: "reduce", ignoreHTTPSErrors: true });
// Keep the homepage storage notice out of the measurement unless asked for; it is audited separately.
if (!process.env.WITH_NOTICE) await context.addInitScript(() => { try { localStorage.setItem("epelawa_cookie_consent", "true"); localStorage.setItem("epelawa-push-onboarding", "dismissed"); } catch {} });
const page = await context.newPage();
const results = [];
for (const route of ROUTES) {
  await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 120_000 }).catch(() => {});
  let first = true;
  for (const [width, height] of VIEWPORTS) {
    await page.setViewportSize({ width, height });
    // FULL_RELOAD=1 reloads at every size (slow on a dev server); by default the page is loaded
    // once per route and then resized, which reflows CSS and fires resize/ResizeObserver code.
    if (first || process.env.FULL_RELOAD) await page.goto(BASE + route, { waitUntil: "load", timeout: 60_000 }).catch(() => {});
    first = false;
    await page.waitForTimeout(250);
    let data;
    try { data = await page.evaluate(inspect); } catch (error) { data = { error: String(error) }; }
    const docOverflow = data.doc ? data.doc.scrollWidth > data.doc.clientWidth : null;
    results.push({ route, width, height, docOverflow, ...data });
    if (docOverflow || data.overflow?.length || data.overlaps?.length) console.log(`${route} ${width}x${height}`, docOverflow ? "DOC-OVERFLOW" : "", JSON.stringify(data.overflow ?? []).slice(0, 300), (data.overlaps ?? []).join("; "));
  }
  console.log(`done ${route}`);
}
await browser.close();
writeFileSync(OUT, JSON.stringify(results, null, 1));
const bad = results.filter((r) => r.docOverflow || r.overflow?.length || r.overlaps?.length);
console.log(`checked ${results.length} route×viewport combinations; ${bad.length} with findings`);
