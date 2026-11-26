import { chromium } from "/home/user/EPE-LAWA/node_modules/@playwright/test/index.mjs";
const b = await chromium.launch({ executablePath: "/tmp/chrlibs/chrome.sh", args: ["--no-sandbox","--no-zygote"] });
for (const w of [320, 360, 375, 390, 414, 767]) {
  const p = await b.newPage({ viewport: { width: w, height: 800 } });
  await p.goto("http://127.0.0.1:3100/", { waitUntil: "load" }); await p.waitForTimeout(1200);
  console.log(w, await p.evaluate(() => { const r = (e) => { const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.right), Math.round(b.top), Math.round(b.bottom)]; };
    const n = document.querySelector(".storage-notice"); const priv = n.querySelector(".btn-ghost"); const copy = n.querySelector(".storage-notice__copy"); const pill = document.querySelector("[class*='floating-support_widget'], [class*='widget']");
    return JSON.stringify({ notice: r(n), priv: r(priv), copyBottom: Math.round(copy.getBoundingClientRect().bottom), pill: pill && r(pill) }); }));
  await p.close();
}
await b.close();
