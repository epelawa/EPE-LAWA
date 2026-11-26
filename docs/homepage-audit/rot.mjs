import { chromium } from "/home/user/EPE-LAWA/node_modules/@playwright/test/index.mjs";
const b = await chromium.launch({ executablePath: "/tmp/chrlibs/chrome.sh", args: ["--no-sandbox","--no-zygote"] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p = await ctx.newPage(); const t0 = Date.now(); const reqs = [];
p.on("request", r => { if (/hero\//.test(r.url())) reqs.push(`${Date.now()-t0}ms ${r.url().replace(/.*optimized\//, "")}`); });
await p.goto(process.argv[2] ?? "http://127.0.0.1:3100/", { waitUntil: "load" });
await p.waitForTimeout(16000);
console.log(reqs.join("\n"));
await b.close();
