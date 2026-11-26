// Homepage audit harness: screenshots, axe-core, structural checks.
// Usage: node audit.mjs <label> <mode>  (mode = stories | empty | error)
import { chromium } from "/home/user/EPE-LAWA/node_modules/@playwright/test/index.mjs";
import fs from "node:fs";
import path from "node:path";

const label = process.argv[2] ?? "before";
const mode = process.argv[3] ?? "stories";
const base = process.env.BASE ?? "http://127.0.0.1:3100";
const outDir = process.env.OUT ?? `/home/user/EPE-LAWA/docs/homepage-audit/screenshots/${label}`;
fs.mkdirSync(outDir, { recursive: true });
const axeSource = fs.readFileSync("/tmp/chr/node_modules/axe-core/axe.min.js", "utf8");

await fetch("http://localhost:54321/__smoke__/mode", { method: "POST", body: JSON.stringify({ mode }), headers: { "content-type": "application/json" } });

const viewports = [
  ["desktop-1440", 1440, 900], ["desktop-1366", 1366, 768],
  ["tablet-1024", 1024, 768], ["tablet-768", 768, 1024],
  ["mobile-390", 390, 844], ["mobile-375", 375, 812], ["mobile-360", 360, 800],
];

const browser = await chromium.launch({ executablePath: "/tmp/chrlibs/chrome.sh", args: ["--no-sandbox", "--no-zygote", "--use-gl=angle", "--use-angle=swiftshader"] });
const report = { label, mode, viewports: {} };

for (const [name, width, height] of viewports) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 240)); });
  page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message.slice(0, 240)));
  const failed = [];
  page.on("requestfailed", (r) => failed.push(r.url()));
  page.on("response", (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
  await page.goto(base + "/", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, `${mode}-${name}-fold.png`) });
  // Force reveal wrappers visible before the full-page shot (content-visibility/IO).
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } window.scrollTo(0, 0); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, `${mode}-${name}-full.png`), fullPage: true });

  const facts = await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
    const headings = [...document.querySelectorAll("h1,h2,h3,h4")].filter(vis).map((h) => `${h.tagName} ${h.textContent.trim().replace(/\s+/g, " ").slice(0, 70)}`);
    const landmarks = [...document.querySelectorAll("header,nav,main,footer,aside,section[aria-label],section[aria-labelledby],[role=region]")].map((el) => `${el.tagName.toLowerCase()}${el.getAttribute("aria-label") ? `[${el.getAttribute("aria-label")}]` : ""}`);
    const small = [...document.querySelectorAll("main a[href], main button, header a[href], header button, footer a[href], footer button")].filter(vis).map((el) => { const r = el.getBoundingClientRect(); return { t: (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((x) => x.w < 24 || x.h < 24);
    const imgsNoAlt = [...document.images].filter((i) => !i.hasAttribute("alt")).map((i) => i.src);
    const hero = document.querySelector(".home-hero__visual")?.getBoundingClientRect();
    const firstNews = document.querySelector(".home-news")?.getBoundingClientRect();
    const notice = document.querySelector(".storage-notice")?.getBoundingClientRect();
    const sections = [...document.querySelectorAll("main section, main nav")].filter(vis).map((s) => { const r = s.getBoundingClientRect(); return `${s.className.split(" ")[0] || s.tagName} y=${Math.round(r.top + scrollY)} h=${Math.round(r.height)}`; });
    return {
      title: document.title,
      metaDescription: document.querySelector('meta[name="description"]')?.content,
      canonical: document.querySelector('link[rel="canonical"]')?.href,
      ogImage: document.querySelector('meta[property="og:image"]')?.content,
      jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent.slice(0, 200)),
      docHeight: document.documentElement.scrollHeight,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      headings, landmarks, small, imgsNoAlt, sections,
      heroBox: hero && { top: Math.round(hero.top), h: Math.round(hero.height) },
      newsTop: firstNews && Math.round(firstNews.top + scrollY),
      noticeBox: notice && { top: Math.round(notice.top), h: Math.round(notice.height), w: Math.round(notice.width) },
    };
  });

  await page.addScriptTag({ content: axeSource });
  const axe = await page.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 6).map((n) => `${n.target.join(" ")} :: ${(n.failureSummary || "").split("\n").slice(1, 2).join(" ").slice(0, 160)}`), count: v.nodes.length }));
  });
  report.viewports[name] = { ...facts, axe, consoleErrors, failed: [...new Set(failed)].slice(0, 20) };
  await context.close();
}

// Keyboard + mobile menu checks at 390px.
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(base + "/", { waitUntil: "load" });
  const order = [];
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press("Tab");
    order.push(await page.evaluate(() => { const a = document.activeElement; const o = getComputedStyle(a).outlineStyle; return `${a.tagName.toLowerCase()} "${(a.getAttribute("aria-label") || a.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40)}" outline=${o}`; }));
  }
  report.keyboardMobile = order;
  await page.getByRole("button", { name: "Open navigation menu" }).first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(outDir, `${mode}-mobile-390-menu.png`) });
  report.menuFocus = await page.evaluate(() => document.activeElement?.textContent?.trim().slice(0, 40) || document.activeElement?.getAttribute("aria-label"));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  report.menuAfterEscape = await page.evaluate(() => ({ open: document.querySelector(".drawer-root")?.getAttribute("data-open"), focus: document.activeElement?.getAttribute("aria-label") }));
  await context.close();
}
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(base + "/", { waitUntil: "load" });
  const order = [];
  for (let i = 0; i < 22; i++) {
    await page.keyboard.press("Tab");
    order.push(await page.evaluate(() => { const a = document.activeElement; return `${a.tagName.toLowerCase()} "${(a.getAttribute("aria-label") || a.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40)}"`; }));
  }
  report.keyboardDesktop = order;
  await context.close();
}

await browser.close();
fs.writeFileSync(path.join(outDir, `${mode}-report.json`), JSON.stringify(report, null, 2));
console.log(`wrote ${outDir}/${mode}-report.json`);
