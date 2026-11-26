import { chromium } from "/home/user/EPE-LAWA/node_modules/@playwright/test/index.mjs";
const b = await chromium.launch({ executablePath: "/tmp/chrlibs/chrome.sh", args: ["--no-sandbox","--no-zygote"] });
for (const [w,h,dsf] of [[1350,940,1],[412,823,1.75]]) {
const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dsf });
await p.addInitScript(() => { window.__ls = []; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__ls.push({ t: Math.round(e.startTime), v: +e.value.toFixed(4), src: e.sources.map(s => (s.node?.id ? "#" + s.node.id : s.node?.className?.toString().slice(0, 40) || s.node?.nodeName) + ` ${JSON.stringify(s.previousRect.toJSON ? [s.previousRect.y, s.previousRect.height] : "")}->${JSON.stringify([s.currentRect.y, s.currentRect.height])}`) }); }).observe({ type: "layout-shift", buffered: true }); });
await p.goto(process.argv[2] ?? "http://127.0.0.1:3100/", { waitUntil: "load" }); await p.waitForTimeout(4000);
console.log(w, JSON.stringify(await p.evaluate(() => window.__ls), null, 0));
await p.close(); }
await b.close();
