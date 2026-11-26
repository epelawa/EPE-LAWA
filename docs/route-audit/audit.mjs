// Route audit: per route x viewport metrics (+ optional screenshots).
// usage: node audit.mjs <outDir> <label> [shotRoutesCsv|all|none] [routesCsv]
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE ?? "http://127.0.0.1:3100";
const [outDir, label, shotArg = "none", routeArg] = process.argv.slice(2);
const VIEWPORTS = [[320, 740], [360, 800], [375, 812], [390, 844], [430, 932], [768, 1024], [1024, 768], [1366, 768], [1440, 900], [1920, 1080]];
const ALL = [
  "/", "/about", "/advertise", "/auth", "/auth/link-expired", "/auth/link-problem", "/auth/new-password", "/auth/verify",
  "/business-directory", "/business-directory/submit", "/business-directory/no-such-business",
  "/contact", "/dashboard", "/events", "/forgot-password",
  "/forum", "/forum/new", "/forum/category/no-such-category", "/forum/thread/no-such-thread",
  "/gallery", "/guidelines", "/itan-ilu-mi", "/itan-ilu-mi/correction", "/login", "/map",
  "/news", "/news/smoke-market-story", "/news/no-such-story", "/news/author/browser-fixture",
  "/newsletter", "/newsletter/confirm", "/newsletter/unsubscribe", "/photo-credits", "/privacy",
  "/radio", "/radio/archive", "/radio/programmes", "/radio/reminders", "/search", "/search?q=market",
  "/support", "/terms", "/tourism", "/tourism/no-such-place", "/who-is-who", "/who-is-who/no-such-person",
];
const routes = routeArg ? routeArg.split(",") : ALL;
const shots = shotArg === "all" ? new Set(routes) : shotArg === "none" ? new Set() : new Set(shotArg.split(","));
fs.mkdirSync(path.join(outDir, "screens"), { recursive: true });

await fetch("http://localhost:54321/__smoke__/mode", { method: "POST", body: JSON.stringify({ mode: process.env.MODE ?? "stories" }) }).catch(() => {});
const browser = await chromium.launch({ executablePath: "/tmp/chr/chrome.sh", args: ["--disable-gpu"] });
const results = [];
for (const route of routes) {
  for (const [w, h] of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: "reduce" });
    // Suppress first-visit overlays so measurements are of the page itself.
    await context.addInitScript(() => {
      try { localStorage.setItem("epelawa-push-onboarding", "dismissed"); sessionStorage.setItem("epelawa-support-bubbles-seen", "3"); } catch {}
    });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
    page.on("pageerror", (e) => errors.push(`pageerror: ${String(e.message).slice(0, 200)}`));
    let status = 0; let finalUrl = "";
    try {
      const resp = await page.goto(BASE + route, { waitUntil: "load", timeout: 45000 });
      status = resp?.status() ?? 0;
      await page.waitForTimeout(600);
      finalUrl = page.url().replace(BASE, "");
    } catch (e) { errors.push(`goto: ${String(e.message).slice(0, 120)}`); }
    const m = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const sw = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
      const offenders = [];
      if (sw > vw + 1) {
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.right > vw + 1 || r.left < -1) {
            // skip descendants of intentional horizontal scrollers
            let p = el.parentElement, inScroller = false;
            while (p && p !== document.body) { const s = getComputedStyle(p); if (["auto", "scroll"].includes(s.overflowX) || s.overflowX === "hidden" || s.overflowX === "clip") { inScroller = true; break; } p = p.parentElement; }
            if (!inScroller) offenders.push(`${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${String(el.className && el.className.baseVal === undefined ? el.className : "").split(" ").slice(0, 2).join(".")} r=${Math.round(r.right)}`);
          }
          if (offenders.length >= 6) break;
        }
      }
      const small = [];
      for (const el of document.querySelectorAll("main a[href], main button, main input:not([type=hidden]), main select, main textarea, header a[href], header button")) {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        if (r.width === 0 || s.visibility === "hidden" || s.display === "inline" && el.tagName === "A" && el.closest("p,li,td,dd")) continue; // inline text links exempt (WCAG 2.5.8 inline exception)
        if (r.height < 44 && r.width < 44 || (r.height < 24 || r.width < 24)) small.push(`${el.tagName.toLowerCase()}:${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 24)} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
      const text = document.body.innerText;
      return {
        vw, sw, overflowX: sw > vw + 1, offenders,
        h1: document.querySelectorAll("h1").length,
        title: document.title,
        smallTargets: small.length, smallSample: small.slice(0, 5),
        lorem: /lorem ipsum/i.test(text),
        dupProvider: /Radio Naija Radio|Naija Radio Radio/i.test(text),
        progressBars: document.querySelectorAll('[role="progressbar"], .scroll-progress, [class*="progress-bar"], [class*="scrollProgress"]').length,
        onAirClaim: /On air now/i.test(text),
      };
    }).catch((e) => ({ error: String(e.message).slice(0, 120) }));
    if (shots.has(route)) {
      const name = `${route === "/" ? "home" : route.slice(1).replace(/[/?=&]+/g, "_")}-${w}.jpg`;
      await page.screenshot({ path: path.join(outDir, "screens", name), type: "jpeg", quality: 62 }).catch(() => {});
    }
    results.push({ route, w, h, status, finalUrl, ...m, consoleErrors: errors.filter((e) => !/Failed to load resource.*(404|401)/.test(e)).slice(0, 4) });
    await context.close();
  }
  const last = results.filter((r) => r.route === route);
  console.log(`${route}  status=${last[0].status} overflowAt=[${last.filter((r) => r.overflowX).map((r) => r.w).join(",")}] small(min..max)=${Math.min(...last.map((r) => r.smallTargets ?? 0))}..${Math.max(...last.map((r) => r.smallTargets ?? 0))} errs=${last.reduce((n, r) => n + (r.consoleErrors?.length ?? 0), 0)}`);
}
await browser.close();
fs.writeFileSync(path.join(outDir, `metrics-${label}.json`), JSON.stringify(results, null, 1));
console.log("done", results.length);
