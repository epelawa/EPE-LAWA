// Forum thread/composer/reaction checks against the audit-only forum fixture
// (docs/route-audit/forum-fixture.mjs in front of the smoke stub). Writes are
// rejected by the stub, so this exercises the honest failure paths for real.
import { chromium } from "@playwright/test";
import fs from "node:fs";
const BASE = process.env.BASE ?? "http://127.0.0.1:3100";
const out = process.argv[2] ?? "docs/route-audit/forum";
fs.mkdirSync(`${out}/screens`, { recursive: true });
const session = { access_token: "browser-smoke-access-token", refresh_token: "browser-smoke-refresh-token", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: "00000000-0000-4000-8000-000000000001", aud: "authenticated", role: "authenticated", email: "member@example.test" } };
const cookie = { name: "sb-localhost-auth-token", value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`, domain: new URL(BASE).hostname, path: "/" };
const results = []; const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`); };
const browser = await chromium.launch({ executablePath: "/tmp/chr/chrome.sh", args: ["--disable-gpu"] });
for (const [w, h] of [[320, 740], [375, 812], [1440, 900]]) {
  const context = await browser.newContext({ viewport: { width: w, height: h } });
  await context.addCookies([cookie]);
  await context.addInitScript(() => { try { localStorage.setItem("epelawa-push-onboarding", "dismissed"); for (const [k, v] of Object.entries({ "epelawa-storage-notice": "acknowledged", "epelawa-storage-notice-v2": "acknowledged", "epelawa-cookie-consent": "accepted", "epe-cookie-notice": "dismissed" })) localStorage.setItem(k, v); } catch {} });
  const page = await context.newPage();
  await page.goto(`${BASE}/forum/thread/audit-thread`, { waitUntil: "load" });
  // Wait for the streamed thread to replace the loading fallback, then count rendered h1s only.
  await page.getByRole("heading", { level: 1, name: "Synthetic audit thread" }).waitFor({ timeout: 15000 });
  check(`[${w}] one h1`, (await page.evaluate(() => [...document.querySelectorAll("h1")].filter((h) => h.offsetParent !== null).length)) === 1);
  check(`[${w}] no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  check(`[${w}] own message styled as own bubble`, (await page.locator('[data-own="true"]').count()) === 1);
  check(`[${w}] last message is the #latest anchor`, (await page.locator("li#latest").count()) === 1);
  const box = await page.getByRole("button", { name: /Send reply/ }).boundingBox();
  check(`[${w}] Send is ≥44px`, Boolean(box && box.height >= 44 && box.width >= 44), box ? `${Math.round(box.width)}×${Math.round(box.height)}` : "missing");
  const widget = await page.locator('button[aria-haspopup="dialog"]').filter({ hasText: "Support" }).first().boundingBox().catch(() => null);
  const overlap = Boolean(box && widget && !(widget.x + widget.width <= box.x || box.x + box.width <= widget.x || widget.y + widget.height <= box.y || box.y + box.height <= widget.y));
  check(`[${w}] floating Support button does not cover Send`, !overlap, widget ? `widget y=${Math.round(widget.y)} send y=${Math.round(box?.y ?? 0)}` : "widget not rendered");
  check(`[${w}] Send disabled while empty`, await page.getByRole("button", { name: /Send reply/ }).isDisabled());
  await page.locator("#reply-body").fill("Synthetic audit reply that the stub will reject.");
  await page.waitForTimeout(350); await page.screenshot({ path: `${out}/screens/thread-${w}.png` });
  await page.getByRole("button", { name: /Send reply/ }).click();
  const alert = page.locator("p[role=alert]").filter({ hasText: "Your message is still here" });
  await alert.waitFor({ timeout: 15000 }).catch(() => {});
  check(`[${w}] failed send shows an error, never success`, (await alert.count()) === 1 && !(await page.getByText("Your reply was posted").count()));
  check(`[${w}] draft kept after failure`, (await page.locator("#reply-body").inputValue()) === "Synthetic audit reply that the stub will reject.");
  check(`[${w}] focus returned to the composer`, await page.evaluate(() => document.activeElement?.id === "reply-body"));
  await page.waitForTimeout(350); await page.screenshot({ path: `${out}/screens/thread-send-failed-${w}.png` });
  const reaction = page.locator("button[aria-pressed]").first();
  const before = await reaction.textContent();
  await reaction.click();
  await page.waitForTimeout(2500);
  check(`[${w}] failed reaction reverts count and pressed state`, (await reaction.textContent()) === before && (await reaction.getAttribute("aria-pressed")) === "false");
  check(`[${w}] failed reaction explains itself`, (await page.locator('[role="alert"], [role="status"]').filter({ hasText: /could not be saved|sign in|Sign in/i }).count()) > 0);
  await page.goto(`${BASE}/forum`, { waitUntil: "load" });
  await page.waitForTimeout(350); await page.screenshot({ path: `${out}/screens/forum-${w}.png` });
  check(`[${w}] forum listing shows the thread`, (await page.getByText("Synthetic audit thread").count()) > 0);
  await context.close();
}
await browser.close();
fs.writeFileSync(`${out}/forum-flows.json`, JSON.stringify(results, null, 1));
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
