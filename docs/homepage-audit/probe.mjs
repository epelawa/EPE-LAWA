import { chromium } from "/home/user/EPE-LAWA/node_modules/@playwright/test/index.mjs";
const b = await chromium.launch({ executablePath: "/tmp/chrlibs/chrome.sh", args: ["--no-sandbox","--no-zygote"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://127.0.0.1:3100/", { waitUntil: "load" }); await p.waitForTimeout(1500);
console.log(await p.evaluate(() => {
  const r = (s) => { const e = document.querySelector(s); if (!e) return s + ": none"; const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return `${s}: top ${Math.round(b.top + scrollY)} bottom ${Math.round(b.bottom + scrollY)} h ${Math.round(b.height)} pad ${cs.padding} margin ${cs.margin}`; };
  return [".connection-panel", ".home-poll", ".public-home", "main#main", ".site-footer", "footer"].map(r).join("\n") + "\n" +
    [...document.querySelectorAll(".public-home > *")].map(e => `${e.className.slice(0,40)} h=${Math.round(e.getBoundingClientRect().height)} mb=${getComputedStyle(e).marginBottom} pb=${getComputedStyle(e).paddingBottom}`).join("\n") + "\n" +
    [...document.querySelectorAll("footer a[href*='facebook'], footer a[href*='youtube']")].map(a => a.outerHTML.slice(0, 600)).join("\n");
}));
await p.setViewportSize({ width: 390, height: 844 }); await p.goto("http://127.0.0.1:3100/", { waitUntil: "load" }); await p.waitForTimeout(1200);
await p.getByRole("button", { name: /open navigation menu/i }).click(); await p.waitForTimeout(600);
console.log(await p.evaluate(() => { const d = document.querySelector("[role=dialog], .nav-drawer, #site-navigation-drawer, .mobile-drawer"); return d ? d.innerText.slice(0, 1500) + "\n---\n" + d.outerHTML.slice(0, 2500) : "no drawer"; }));
await b.close();
