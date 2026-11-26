// Interaction checks for the header search dialog, Notification Centre and push onboarding.
// Usage: BASE=http://127.0.0.1:3100 node interactions.mjs <outDir>
// Runs against a local production build + the browser-smoke Supabase stub. Search results,
// empty and stale states are produced by intercepting /api/search in the browser (the stub
// has no business/people/forum fixtures); the error state uses the real API against the stub.
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE ?? "http://127.0.0.1:3100";
const out = process.argv[2] ?? "./interactions";
fs.mkdirSync(path.join(out, "screens"), { recursive: true });
const results = [];
const check = (name, pass, detail = "") => { results.push({ name, pass: Boolean(pass), detail }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`); };

const session = {
  access_token: "browser-smoke-access-token", refresh_token: "browser-smoke-refresh-token", token_type: "bearer", expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: "00000000-0000-4000-8000-000000000001", aud: "authenticated", role: "authenticated", email: "browser-smoke@example.invalid", user_metadata: { display_name: "Smoke" }, app_metadata: { provider: "email" } },
};
const sessionCookie = { name: "sb-localhost-auth-token", value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`, url: BASE, sameSite: "Lax" };
const quiet = { "epelawa-storage-notice": "acknowledged", "epelawa-storage-notice-v2": "acknowledged", "epelawa-cookie-consent": "accepted", "epe-cookie-notice": "dismissed" };

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/tmp/chr/chrome.sh", args: ["--disable-gpu"] });

const freshPermission = () => {
  let state = "default";
  Object.defineProperty(Notification, "permission", { configurable: true, get: () => state });
  Notification.requestPermission = () => { state = "granted"; return Promise.resolve("granted"); };
};
async function newPage(viewport, { signedIn = false, onboarding = "dismissed", fresh = false } = {}) {
  const context = await browser.newContext({ viewport, ignoreHTTPSErrors: true });
  if (fresh) await context.addInitScript(freshPermission);
  if (signedIn) await context.addCookies([sessionCookie]);
  await context.addInitScript(([storage, onboardingValue]) => {
    try {
      for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value);
      if (onboardingValue) localStorage.setItem("epelawa-push-onboarding", onboardingValue);
    } catch {}
  }, [quiet, onboarding]);
  const page = await context.newPage();
  page.on("pageerror", (error) => console.log("  pageerror:", error.message.slice(0, 200)));
  return { context, page };
}
const groupsFor = (q) => ({ state: "ok", query: q, total: 2, groups: [
  { key: "news", label: "News", items: [{ title: `Story about ${q}`, href: "/news/fixture-a", subline: "Local News · 1 Nov 2026" }] },
  { key: "places", label: "Places", items: [{ title: `Place for ${q}`, href: "/tourism/fixture-b", subline: null }] },
] });
const shown = (scope, re) => scope.locator("p:not([role=status])").filter({ hasText: re }).first();
const dismissStorageNotice = async (page) => { const btn = page.getByRole("button", { name: "Got it" }); if (await btn.isVisible().catch(() => false)) await btn.click(); };

for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
  const tag = `${viewport.width}`;
  // ---------- Search dialog ----------
  {
    const { context, page } = await newPage(viewport);
    let calls = 0;
    await page.route("**/api/search?*", async (route) => {
      const url = new URL(route.request().url());
      const q = url.searchParams.get("q") ?? "";
      calls += 1;
      if (q === "zzzz") return route.fulfill({ json: { state: "ok", query: q, total: 0, groups: [] } });
      if (q === "slow") { await new Promise((resolve) => setTimeout(resolve, 1600)); return route.fulfill({ json: groupsFor("slow") }); }
      if (q === "real") return route.continue();
      return route.fulfill({ json: groupsFor(q) });
    });
    await page.goto(`${BASE}/about`, { waitUntil: "load" });
    await dismissStorageNotice(page);
    const trigger = page.locator("button.header-search");
    check(`[${tag}] search trigger is a button with accessible name`, await trigger.getAttribute("aria-label") === "Search EPE LAWA" && await trigger.evaluate((el) => el.tagName) === "BUTTON");
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Search EPE LAWA" });
    await dialog.waitFor({ state: "visible", timeout: 5000 });
    check(`[${tag}] dialog title + subtitle`, await dialog.getByText("Find stories, people, businesses, places and more across Epe.").isVisible());
    const input = dialog.getByRole("searchbox").or(dialog.getByRole("combobox")).first();
    check(`[${tag}] placeholder`, (await input.getAttribute("placeholder")) === "What are you looking for?");
    check(`[${tag}] input focused on open`, await input.evaluate((el) => el === document.activeElement));
    const box = await page.locator("dialog[open]").boundingBox();
    if (viewport.width >= 1024) check(`[${tag}] desktop width 600–720`, box && box.width >= 600 && box.width <= 720, `${Math.round(box?.width ?? 0)}px`);
    else check(`[${tag}] mobile full-height sheet`, box && box.width >= viewport.width - 1 && box.height >= viewport.height - 2, `${Math.round(box?.width ?? 0)}×${Math.round(box?.height ?? 0)}`);
    const docOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    check(`[${tag}] no horizontal overflow with dialog open`, !docOverflow);
    await page.waitForTimeout(350); await page.screenshot({ path: path.join(out, "screens", `search-idle-${tag}.png`) });

    await input.fill("m");
    await page.waitForTimeout(400);
    check(`[${tag}] 1 character shows min-length hint, no request`, await shown(dialog, /at least 2 characters/).isVisible() && calls === 0, `calls=${calls}`);
    await input.fill("market");
    await dialog.getByText("Story about market").waitFor({ timeout: 4000 });
    check(`[${tag}] results grouped`, await dialog.getByRole("heading", { name: "News" }).isVisible() && await dialog.getByRole("heading", { name: "Places" }).isVisible());
    await page.waitForTimeout(350); await page.screenshot({ path: path.join(out, "screens", `search-results-${tag}.png`) });
    await input.press("ArrowDown");
    const focusedHref = await page.evaluate(() => document.activeElement?.getAttribute("href"));
    check(`[${tag}] ArrowDown moves focus into results`, focusedHref === "/news/fixture-a", String(focusedHref));
    await page.keyboard.press("ArrowDown");
    check(`[${tag}] ArrowDown again moves to next result`, await page.evaluate(() => document.activeElement?.getAttribute("href")) === "/tourism/fixture-b");

    // Stale protection: a slow older request must not overwrite a newer one.
    await input.fill("slow");
    await page.waitForTimeout(450);
    await input.fill("fresh");
    await dialog.getByText("Story about fresh").waitFor({ timeout: 4000 });
    await page.waitForTimeout(1700);
    check(`[${tag}] stale (slower, older) response ignored`, await dialog.getByText("Story about fresh").isVisible() && !(await dialog.getByText("Story about slow").isVisible().catch(() => false)));

    await input.fill("zzzz");
    await shown(dialog, /No results for/).waitFor({ timeout: 4000 });
    check(`[${tag}] no-results state`, true);
    await page.waitForTimeout(350); await page.screenshot({ path: path.join(out, "screens", `search-empty-${tag}.png`) });

    await input.fill("real");
    const errorTitle = shown(dialog, "Search is unavailable right now.");
    await errorTitle.waitFor({ timeout: 6000 }).catch(() => {});
    check(`[${tag}] error state from real API (stub lacks collections)`, await errorTitle.isVisible());
    check(`[${tag}] retry control in error state`, await dialog.getByRole("button", { name: /try again/i }).isVisible());
    await page.waitForTimeout(350); await page.screenshot({ path: path.join(out, "screens", `search-error-${tag}.png`) });

    // Tab stays inside the modal (native <dialog> showModal makes the page inert).
    let escaped = false;
    for (let i = 0; i < 25; i++) { await page.keyboard.press("Tab"); if (!(await page.evaluate(() => Boolean(document.activeElement?.closest("dialog[open]"))))) { escaped = true; break; } }
    check(`[${tag}] focus trapped while open`, !escaped);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
    check(`[${tag}] Escape closes`, !(await page.locator("dialog[open]").count()));
    check(`[${tag}] focus restored to trigger`, await trigger.evaluate((el) => el === document.activeElement));

    // Outside click (backdrop) closes.
    await trigger.click();
    await dialog.waitFor({ state: "visible" });
    if (viewport.width >= 1024) {
      await page.mouse.click(10, viewport.height - 10);
      await page.waitForTimeout(250);
      check(`[${tag}] backdrop click closes`, !(await page.locator("dialog[open]").count()));
    } else {
      await dialog.getByRole("button", { name: /close/i }).first().click();
      await page.waitForTimeout(250);
      check(`[${tag}] close button closes mobile sheet`, !(await page.locator("dialog[open]").count()));
    }

    // "/" opens search on pages without their own search field.
    await page.locator("body").click({ position: { x: 5, y: viewport.height - 5 } }).catch(() => {});
    await page.keyboard.press("/");
    await page.waitForTimeout(300);
    check(`[${tag}] "/" opens the search dialog`, await page.locator("dialog[open]").count() === 1);
    await page.keyboard.press("Escape");
    await context.close();
  }
  // ---------- Legacy /search URL ----------
  {
    const { context, page } = await newPage(viewport);
    await page.route("**/api/search?*", (route) => route.fulfill({ json: groupsFor("market") }));
    const response = await page.goto(`${BASE}/search?q=market`, { waitUntil: "load" });
    await page.locator("dialog[open]").waitFor({ timeout: 5000 }).catch(() => {});
    const value = await page.locator("dialog[open] input").inputValue().catch(() => "");
    check(`[${tag}] /search?q= redirects to home with dialog open + query kept`, new URL(page.url()).pathname === "/" && value === "market", `status=${response?.status()} url=${page.url()} value=${value}`);
    check(`[${tag}] redirect params cleaned from the address bar`, !page.url().includes("open=search"), page.url());
    await context.close();
  }
  // ---------- Notification Centre (signed out) ----------
  {
    const { context, page } = await newPage(viewport);
    await page.goto(`${BASE}/about`, { waitUntil: "load" });
    await dismissStorageNotice(page);
    const bell = page.locator("button.header-notification");
    check(`[${tag}] bell is a button, no badge when signed out`, await bell.count() === 1 && (await bell.getAttribute("aria-label")) === "Notifications");
    await bell.click();
    const dialog = page.getByRole("dialog", { name: "Notifications" });
    await dialog.waitFor({ state: "visible", timeout: 5000 });
    check(`[${tag}] notifications subtitle`, await dialog.getByText("Stay updated with what is happening across Epe.").isVisible());
    await page.waitForTimeout(600);
    check(`[${tag}] honest signed-out feed state`, await dialog.getByText(/appear here when you are signed in/).isVisible());
    const pushCopy = await dialog.getByText(/linked to a member account|not available on EPE LAWA yet|cannot receive push/).first().isVisible();
    check(`[${tag}] honest signed-out push state`, pushCopy);
    const box = await page.locator("dialog[open]").boundingBox();
    if (viewport.width >= 1024) check(`[${tag}] desktop popover 380–440`, box && box.width >= 380 && box.width <= 440, `${Math.round(box?.width ?? 0)}px`);
    else check(`[${tag}] mobile bottom sheet full width`, box && box.width >= viewport.width - 1 && Math.abs(box.y + box.height - viewport.height) < 2, `${Math.round(box?.width ?? 0)} wide, bottom ${Math.round((box?.y ?? 0) + (box?.height ?? 0))}`);
    await page.waitForTimeout(350); await page.screenshot({ path: path.join(out, "screens", `notifications-signedout-${tag}.png`) });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
    check(`[${tag}] notifications Escape + focus restore`, !(await page.locator("dialog[open]").count()) && await bell.evaluate((el) => el === document.activeElement));
    await context.close();
  }
  // ---------- Notification Centre (signed in) ----------
  {
    // Denied first: headless Chromium reports "denied" until permission is granted.
    {
      const denied = await newPage(viewport, { signedIn: true });
      await denied.page.route("**/api/notifications/subscribe", (route) => route.fulfill({ json: { topics: { news: false, radio: false } } }));
      await denied.page.route(/localhost:54322\/rest\/v1\/notifications/, (route) => route.fulfill({ status: 200, json: [], headers: { "access-control-allow-origin": "*", "content-range": "*/0" } }));
      await denied.page.goto(`${BASE}/about`, { waitUntil: "load" });
      await dismissStorageNotice(denied.page);
      await denied.page.locator("button.header-notification").click();
      const deniedDialog = denied.page.getByRole("dialog", { name: "Notifications" });
      await deniedDialog.getByText(/blocked for this site/).waitFor({ timeout: 6000 }).catch(() => {});
      check(`[${tag}] denied permission shows Blocked with recovery steps, no Enable button`, await deniedDialog.getByText(/blocked for this site/).isVisible() && !(await deniedDialog.getByRole("button", { name: "Enable notifications" }).count()));
      await denied.page.waitForTimeout(350); await denied.page.screenshot({ path: path.join(out, "screens", `notifications-denied-${tag}.png`) });
      await denied.context.close();
    }
    const { context, page } = await newPage(viewport, { signedIn: true });
    // Headless Chromium keeps Notification.permission at "denied" even after grantPermissions, so the
    // permission API alone is stubbed ("default", then "granted" on request). The real
    // pushManager.subscribe() still runs and fails (no push service in headless), exercising the failure path.
    await context.addInitScript(() => {
      let state = "default";
      Object.defineProperty(Notification, "permission", { configurable: true, get: () => state });
      Notification.requestPermission = () => { state = "granted"; return Promise.resolve("granted"); };
    });
    // The local stub sends no CORS headers for browser-side reads; serve the member's (empty) feed with CORS.
    await page.route(/localhost:54322\/rest\/v1\/notifications/, (route) => route.fulfill({ status: 200, json: [], headers: { "access-control-allow-origin": "*", "access-control-expose-headers": "content-range", "content-range": "*/0" } }));
    let posted = null;
    await page.route("**/api/notifications/subscribe", async (route) => {
      const method = route.request().method();
      if (method === "GET") return route.fulfill({ json: { topics: { news: false, radio: false } } });
      if (method === "POST") { posted = route.request().postDataJSON(); return route.fulfill({ json: { saved: true, topics: posted.topics } }); }
      return route.fulfill({ json: { saved: true, topics: { news: true, radio: false } } });
    });
    await page.goto(`${BASE}/about`, { waitUntil: "load" });
    await dismissStorageNotice(page);
    const bell = page.locator("button.header-notification");
    await page.waitForTimeout(800);
    check(`[${tag}] no unread badge without real unread rows`, (await bell.getAttribute("aria-label")) === "Notifications");
    await bell.click();
    const dialog = page.getByRole("dialog", { name: "Notifications" });
    await dialog.waitFor({ state: "visible" });
    await dialog.getByText(/No notifications yet|could not be loaded/).first().waitFor({ timeout: 5000 }).catch(() => {});
    check(`[${tag}] member feed: honest empty state (stub has no rows)`, await dialog.getByText("No notifications yet. You have not missed anything.").isVisible());
    await dialog.getByRole("button", { name: "Enable notifications" }).waitFor({ timeout: 5000 }).catch(() => {});
    const enable = dialog.getByRole("button", { name: "Enable notifications" });
    check(`[${tag}] member push: Off with Enable button and topic switches`, await enable.isVisible() && await dialog.getByRole("switch", { name: /News/ }).isVisible() && await dialog.getByRole("switch", { name: /Radio/ }).isVisible());
    await page.waitForTimeout(350); await page.screenshot({ path: path.join(out, "screens", `notifications-member-${tag}.png`) });
    // Permission is granted, but headless Chromium has no push service, so subscribing fails: the result must be an honest failure, never a fake success.
    await enable.click();
    await dialog.locator("[role=alert], [role=status]").filter({ hasText: /blocked|not granted|could not|cannot/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
    const message = await dialog.locator("p[role=alert], p[role=status]").allInnerTexts();
    check(`[${tag}] enabling without browser permission reports failure, no false success`, !message.some((text) => /are on for this device/.test(text)) && posted === null, message.join(" | "));
    await page.waitForTimeout(350); await page.screenshot({ path: path.join(out, "screens", `notifications-member-failed-${tag}.png`) });
    await context.close();
  }
  // ---------- First-visit onboarding ----------
  {
    // Browser already decided (headless reports "denied"): onboarding must stay away.
    const decided = await newPage(viewport, { signedIn: true, onboarding: null });
    await decided.page.goto(`${BASE}/about`, { waitUntil: "load" });
    await dismissStorageNotice(decided.page);
    await decided.page.waitForTimeout(11000);
    check(`[${tag}] onboarding never shown once the browser permission is decided`, !(await decided.page.locator("[data-push-onboarding]").count()));
    await decided.context.close();
  }
  {
    // Fresh browser (permission "default", simulated: see freshPermission).
    const { context, page } = await newPage(viewport, { signedIn: true, onboarding: null, fresh: true });
    await page.goto(`${BASE}/about`, { waitUntil: "load" });
    await dismissStorageNotice(page);
    const card = page.locator("[data-push-onboarding]");
    check(`[${tag}] onboarding not shown immediately on load`, !(await card.count()));
    await card.waitFor({ timeout: 16000 }).catch(() => {});
    const shown = await card.count();
    check(`[${tag}] onboarding appears for a signed-in member after a delay`, shown === 1);
    if (shown) {
      check(`[${tag}] onboarding copy`, await card.getByRole("heading", { name: "Stay connected to Epe." }).isVisible() && await card.getByText("Get important local news and radio updates from EPE LAWA, delivered when they matter.").isVisible());
      check(`[${tag}] onboarding buttons`, await card.getByRole("button", { name: "Enable notifications" }).isVisible() && await card.getByRole("button", { name: "Not now" }).isVisible() && await card.getByRole("button", { name: "Choose what I receive" }).isVisible());
      await card.getByRole("button", { name: "Choose what I receive" }).click();
      check(`[${tag}] topic toggles revealed`, await card.getByRole("switch", { name: /News/ }).isVisible() && await card.getByRole("switch", { name: /Radio/ }).isVisible());
      await page.waitForTimeout(350); await page.screenshot({ path: path.join(out, "screens", `onboarding-${tag}.png`) });
      await card.getByRole("button", { name: "Not now" }).click();
      const stored = await page.evaluate(() => localStorage.getItem("epelawa-push-onboarding"));
      check(`[${tag}] Not now remembered`, stored === "dismissed", String(stored));
      await page.reload({ waitUntil: "load" });
      await page.waitForTimeout(12000);
      check(`[${tag}] never re-prompts after dismissal`, !(await page.locator("[data-push-onboarding]").count()));
    }
    await context.close();
  }
  // ---------- Onboarding is not shown to visitors or over an open dialog ----------
  {
    const { context, page } = await newPage(viewport, { onboarding: null, fresh: true });
    await page.goto(`${BASE}/about`, { waitUntil: "load" });
    await dismissStorageNotice(page);
    await page.waitForTimeout(11000);
    check(`[${tag}] onboarding not shown to signed-out visitors`, !(await page.locator("[data-push-onboarding]").count()));
    await context.close();
  }
}
await browser.close();
const passed = results.filter((r) => r.pass).length;
fs.writeFileSync(path.join(out, "interactions.json"), JSON.stringify({ base: BASE, passed, failed: results.length - passed, results }, null, 2));
console.log(`\n${passed}/${results.length} checks passed`);
