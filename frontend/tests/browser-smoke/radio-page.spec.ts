import { expect, test, type Page } from "@playwright/test";
import { GUTS_FM } from "../../apps/main/lib/guts-radio";

// Turn 5: /radio redesign, the persistent mini-player, the removals and the compact forms.
// Synthetic fixture only. The real station stream is never contacted: every request to it is
// intercepted, so these tests prove player behaviour, not that a live broadcaster is reachable.

const fixture = `http://localhost:${process.env.SMOKE_FIXTURE_PORT ?? "54321"}`;
const STREAM = /^https:\/\/azstream\.elektranbroadcast\.com\//;

/** 20 s of 8 kHz 8-bit mono silence: a valid WAV that Chromium can decode without codecs. */
function silentWav(seconds = 20) {
  const rate = 8000, samples = rate * seconds;
  const buffer = Buffer.alloc(44 + samples, 128);
  buffer.write("RIFF", 0); buffer.writeUInt32LE(36 + samples, 4); buffer.write("WAVE", 8);
  buffer.write("fmt ", 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate, 28); buffer.writeUInt16LE(1, 32); buffer.writeUInt16LE(8, 34);
  buffer.write("data", 36); buffer.writeUInt32LE(samples, 40);
  return buffer;
}

async function quietStart(page: Page) {
  await page.addInitScript(() => {
    try { localStorage.setItem("epelawa_cookie_consent", "true"); localStorage.setItem("epelawa-push-onboarding", "dismissed"); } catch { /* storage blocked */ }
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
}

test.beforeEach(async ({ request }) => {
  expect((await request.post(`${fixture}/__smoke__/mode`, { data: { mode: "empty" } })).ok()).toBeTruthy();
});

test("radio page is honest before Play and the removed features are gone", async ({ page }) => {
  test.setTimeout(120_000);
  await quietStart(page);
  const streamRequests: string[] = [];
  page.on("request", (req) => { if (STREAM.test(req.url())) streamRequests.push(req.url()); });
  await page.goto("/radio");
  await expect(page.getByRole("heading", { name: "The sound of Epe.", level: 1 })).toBeVisible();
  await expect(page.getByText("Stay connected to the people, stories and conversations shaping our community.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Listen live" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore programmes" })).toHaveAttribute("href", "/radio/programmes");
  // Never claims live before audio is actually playing.
  await expect(page.locator("#live-player")).toContainText("Not playing");
  await expect(page.locator("#live-player")).not.toContainText(/\bLive\b/);
  await expect(page.getByRole("status").filter({ hasText: /Press Play to listen to Radio Lagos/ })).toBeVisible();
  // Honest schedule empty state; the Thursday database fallback is not dressed up as a programme.
  await expect(page.getByRole("heading", { name: "The schedule is being updated" })).toBeVisible();
  await expect(page.locator("#schedule")).not.toContainText(/Thursday|1:30/);
  // Owner-requested removals.
  for (const gone of [/Station catalogue/, /Naija Radio/, /No EPE LAWA programme is scheduled right now/, /Request a song/, /Browse the archive/, /Programme archive/]) {
    await expect(page.locator("main")).not.toContainText(gone);
  }
  await expect(page.locator('a[href="/radio/archive"]')).toHaveCount(0);
  // The sponsored slot is still there, labelled, and never a broken image.
  const slot = page.getByRole("complementary", { name: "Sponsored placement" });
  await expect(slot).toBeVisible();
  // Polled: on a cold dev server the image may still be loading; a broken image never passes.
  for (const img of await slot.locator("img").all()) await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  // No stream request until the listener presses Play.
  await page.waitForTimeout(500);
  expect(streamRequests).toEqual([]);
  // Old archive links land on the radio page.
  await page.goto("/radio/archive");
  await expect(page).toHaveURL(/\/radio$/);
});

test("programme listings and calendar use the published fixture schedule", async ({ page, request }) => {
  test.setTimeout(120_000);
  expect((await request.post(`${fixture}/__smoke__/mode`, { data: { mode: "radio" } })).ok()).toBeTruthy();
  await page.goto("/radio/programmes");
  await expect(page.getByRole("heading", { name: "Fixture morning slot" }).first()).toBeVisible();
  const calendar = await request.get("/api/radio/schedule.ics");
  expect(calendar.ok()).toBeTruthy();
  expect(calendar.headers()["content-type"]).toContain("text/calendar");
  const body = await calendar.text();
  expect(body).toContain("SUMMARY:Fixture morning slot");
  expect(body).toMatch(/DTSTART:\d{8}T060000Z\r\nDTEND:\d{8}T070000Z/);
});

test("one stream plays, keeps playing in the mini-player across pages, and hiding it does not stop it", async ({ page }) => {
  test.setTimeout(180_000);
  await quietStart(page);
  let streamRequests = 0;
  await page.route(STREAM, async (route) => { streamRequests++; await route.fulfill({ status: 200, contentType: "audio/wav", body: silentWav() }); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/radio");
  await page.getByRole("button", { name: /^Play Radio Lagos/ }).click();
  await expect(page.locator("#live-player")).toContainText("Live", { timeout: 20_000 });
  await expect(page.getByRole("status").filter({ hasText: /Playing Radio Lagos 107\.5 FM/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause radio", exact: true })).toBeVisible();
  expect(streamRequests).toBeGreaterThanOrEqual(1);
  const before = streamRequests;
  // No mini-player on /radio itself.
  await expect(page.getByRole("region", { name: "Radio mini-player" })).toHaveCount(0);
  // Client-side navigation keeps the same session: the mini-player appears and the stream is not refetched.
  await page.getByRole("link", { name: "Latest news" }).click();
  await expect(page).toHaveURL(/\/news$/);
  const mini = page.getByRole("region", { name: "Radio mini-player" });
  await expect(mini).toBeVisible();
  await expect(mini).toContainText("Radio Lagos");
  await expect(mini).toContainText("Live");
  expect(streamRequests).toBe(before);
  // It stays inside the viewport, above the safe area, and clear of the Support button.
  const box = await mini.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
  const support = page.getByRole("button", { name: /^Support/ }).first();
  if (await support.isVisible().catch(() => false)) {
    const s = (await support.boundingBox())!;
    const overlap = Math.min(s.x + s.width, box!.x + box!.width) - Math.max(s.x, box!.x) > 0 && Math.min(s.y + s.height, box!.y + box!.height) - Math.max(s.y, box!.y) > 0;
    expect(overlap).toBe(false);
  }
  // Hide without stopping: the element is gone but audio carries on.
  await mini.getByRole("button", { name: /Hide mini-player/ }).click();
  await expect(mini).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-radio-mini"))).toBe(false);
  // Back through an in-app link (a full reload would, correctly, end the session).
  await page.locator("footer a[href='/radio']").first().click();
  await expect(page).toHaveURL(/\/radio$/);
  await expect(page.locator("#live-player")).toContainText("Live");
  // Pause releases the live stream.
  await page.getByRole("button", { name: /^Pause Radio Lagos/ }).click();
  await expect(page.getByRole("status").filter({ hasText: /Paused\. Press Play to rejoin/ })).toBeVisible();
  expect(await page.locator("#live-player").textContent()).not.toMatch(/\bLive\b/);
});

test("an unreachable stream reports honestly and offers a retry", async ({ page }) => {
  test.setTimeout(120_000);
  await quietStart(page);
  await page.route(STREAM, (route) => route.abort("connectionrefused"));
  await page.goto("/radio");
  await page.getByRole("button", { name: /^Play Radio Lagos/ }).click();
  await expect(page.getByRole("status").filter({ hasText: /not responding right now/ })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("#live-player")).toContainText("Unavailable");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(page.locator("#live-player")).not.toContainText(/\bLive\b/);
});

test("the guide shows published slots in WAT with a day selector and the on-air marker", async ({ page, request }) => {
  test.setTimeout(120_000);
  await quietStart(page);
  await request.post(`${fixture}/__smoke__/mode`, { data: { mode: "radio" } });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/radio");
  await expect(page.getByText("All times WAT (UTC+1)")).toBeVisible();
  const days = page.getByRole("group", { name: "Choose a day" });
  await expect(days.getByRole("button")).toHaveCount(7);
  await expect(days.getByRole("button", { pressed: true })).toContainText("(today)");
  await expect(page.locator("#schedule")).toContainText("Fixture all-day slot");
  await expect(page.locator("#schedule")).toContainText("On air now (per schedule)");
  await expect(page.locator("#live-player")).toContainText("Scheduled now");
  const otherIndex = await days.getByRole("button").evaluateAll((buttons) => buttons.findIndex((b) => b.getAttribute("aria-pressed") === "false"));
  const other = days.getByRole("button").nth(otherIndex);
  await other.click();
  await expect(other).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#schedule")).toContainText("Fixture morning slot");
  await expect(page.locator("#schedule")).not.toContainText("On air now");
  const size = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
  expect(size.document).toBeLessThanOrEqual(size.viewport);
  await request.post(`${fixture}/__smoke__/mode`, { data: { mode: "empty" } });
});

test("radio reminders confirm before asking and never prompt on load", async ({ page }) => {
  test.setTimeout(120_000);
  await quietStart(page);
  await page.addInitScript(() => {
    (window as unknown as { __permissionAsks: number }).__permissionAsks = 0;
    if ("Notification" in window) {
      const original = Notification.requestPermission.bind(Notification);
      Notification.requestPermission = (...args: Parameters<typeof Notification.requestPermission>) => { (window as unknown as { __permissionAsks: number }).__permissionAsks++; return original(...args); };
    }
  });
  await page.goto("/radio");
  const card = page.locator("section", { has: page.getByRole("heading", { name: "Never miss a programme" }) });
  await expect(card).toContainText("browser push notification on this device");
  const ask = card.getByRole("button", { name: "Remind me when radio goes on air" });
  if (await ask.count()) {
    await ask.click();
    const group = card.getByRole("group", { name: "Confirm radio notifications" });
    await expect(group).toBeVisible();
    await group.getByRole("button", { name: "Cancel" }).click();
    await expect(group).toHaveCount(0);
  } else {
    // Headless shells without Push support show the honest unavailable message instead.
    await expect(card).toContainText(/Push notifications are not available|Notifications are blocked/);
  }
  expect(await page.evaluate(() => (window as unknown as { __permissionAsks: number }).__permissionAsks)).toBe(0);
});

test("map location prompts after in-app navigation and the Google notice is a compact disclosure", async ({ page, context }) => {
  test.setTimeout(150_000);
  await quietStart(page);
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 6.5905, longitude: 3.9843 });
  // Arrive on another page first: Permissions-Policy is per document, so this is the case that broke.
  await page.goto("/about");
  await page.getByRole("contentinfo").locator('a[href="/map"]').first().click();
  await expect(page).toHaveURL(/\/map$/);
  await page.getByRole("button", { name: "Use my location" }).click();
  await expect(page.getByText(/Your position is marked on the map below/)).toBeVisible({ timeout: 15_000 });
  const notice = page.locator("details.fine-print");
  await expect(notice.locator("summary")).toHaveText("About Google Maps and your location");
  await expect(notice.getByText(/provided by an external service operated by Google/)).toBeHidden();
  await notice.locator("summary").click();
  await expect(notice.getByText(/EPE LAWA does not store your coordinates/)).toBeVisible();
});

test("compact filter forms sit on one line on desktop and stay named for assistive tech", async ({ page }) => {
  test.setTimeout(150_000);
  await quietStart(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  for (const [route, label, fields] of [
    ["/who-is-who", "Filter people", ["Name", "Office or institution", "Community"]],
    ["/itan-ilu-mi", "Search published records", ["Family name or community", "Category"]],
  ] as const) {
    await page.goto(route);
    const form = page.getByRole("search", { name: label });
    await expect(form).toBeVisible();
    for (const name of fields) await expect(form.getByLabel(name, { exact: true })).toBeVisible();
    // Vertical centres within 8px of each other = one row. Polled, because the dev server can apply
    // late-arriving CSS after the first paint.
    await expect.poll(async () => {
      const centres: number[] = [];
      for (const name of fields) { const box = (await form.getByLabel(name, { exact: true }).boundingBox())!; centres.push(box.y + box.height / 2); }
      return Math.max(...centres) - Math.min(...centres);
    }, { message: `${route} fields share one row` }).toBeLessThanOrEqual(8);
    expect((await form.boundingBox())!.height, `${route} form is compact`).toBeLessThan(90);
  }
  await expect(page.getByText("Correction and removal requests")).toHaveCount(0);
  await page.goto("/gallery");
  await expect(page.getByText(/A beautiful archive starts with responsible sourcing/)).toHaveCount(0);
});

const MATRIX: Array<[number, number]> = [
  [320, 568], [320, 640], [360, 740], [360, 800], [375, 812], [390, 844], [414, 896], [430, 932],
  [640, 360], [740, 360], [844, 390], [600, 960], [768, 1024], [820, 1180], [1024, 768],
  [1280, 720], [1366, 768], [1440, 900], [1536, 864], [1920, 1080], [2560, 1440],
];

test("changed routes have no horizontal overflow across the owner's viewport matrix", async ({ page }) => {
  test.setTimeout(420_000);
  await quietStart(page);
  for (const route of ["/radio", "/radio/programmes", "/who-is-who", "/itan-ilu-mi", "/map", "/gallery", "/"]) {
    await page.goto(route);
    for (const [width, height] of MATRIX) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(60);
      const size = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
      expect(size.document, `${route} at ${width}x${height}`).toBeLessThanOrEqual(size.viewport);
    }
  }
});


test("Guts FM plays on demand and keeps playing in the mini-player", async ({ page }) => {
  await quietStart(page);
  let requests = 0;
  await page.route(GUTS_FM.streamUrl, async (route) => {
    requests++;
    await route.fulfill({ status: 200, contentType: "audio/wav", body: silentWav() });
  });
  await page.goto("/radio");
  await page.getByRole("button", { name: "Guts FM 104.9 FM", exact: true }).click();
  expect(requests).toBe(0);
  await page.getByRole("button", { name: "Play Guts FM 104.9 FM", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Playing Guts FM 104.9 FM" })).toBeVisible();
  expect(requests).toBeGreaterThan(0);
  const started = requests;
  await page.getByRole("link", { name: /^Latest news/ }).click();
  const mini = page.getByRole("region", { name: "Radio mini-player" });
  await expect(mini).toContainText("Guts FM");
  await expect(mini).toContainText("Live");
  expect(requests).toBe(started);
  await mini.getByRole("button", { name: "Pause Guts FM", exact: true }).click();
  await expect(mini).toContainText("Paused");
});

test("an unreachable Guts FM stream offers a retry and the station website", async ({ page }) => {
  await quietStart(page);
  await page.route(GUTS_FM.streamUrl, (route) => route.abort());
  await page.goto("/radio");
  await page.getByRole("button", { name: "Guts FM 104.9 FM", exact: true }).click();
  await page.getByRole("button", { name: "Play Guts FM 104.9 FM", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Guts FM 104.9 FM is not responding" })).toBeVisible();
  await expect(page.locator("#live-player").getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Listen on the Guts FM website/ })).toHaveAttribute("href", GUTS_FM.websiteUrl);
});
