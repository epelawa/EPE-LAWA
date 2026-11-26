import { chromium } from "/home/user/EPE-LAWA/node_modules/@playwright/test/index.mjs";
const b = await chromium.launch({ executablePath: "/tmp/chrlibs/chrome.sh", args: ["--no-sandbox","--no-zygote"] });
for (const rm of ["no-preference","reduce"]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: rm });
  const p = await ctx.newPage();
  await p.addInitScript(() => { window.__lcp = []; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp.push({ t: Math.round(e.startTime), size: e.size, el: e.element ? (e.element.alt || e.element.tagName + "." + e.element.className).slice(0, 50) : e.url }); }).observe({ type: "largest-contentful-paint", buffered: true }); });
  await p.goto(process.argv[2] ?? "http://127.0.0.1:3100/", { waitUntil: "load" });
  await p.waitForTimeout(18000);
  console.log(rm, JSON.stringify(await p.evaluate(() => window.__lcp)));
  await ctx.close();
}
await b.close();
