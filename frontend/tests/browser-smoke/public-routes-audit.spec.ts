import { expect, test } from "@playwright/test";

// Synthetic fixture: this verifies route rendering, not production providers or writes.
const routes = ["/", "/news", "/about", "/advertise", "/contact", "/business-directory", "/events", "/forum", "/gallery", "/guidelines", "/itan-ilu-mi", "/map", "/photo-credits", "/privacy", "/radio", "/radio/archive", "/radio/programmes", "/terms", "/tourism", "/who-is-who", "/login", "/forgot-password"];
for (const width of [320, 1440]) {
  test(`public routes render without horizontal overflow at ${width}px`, async ({ page, request }) => {
    test.setTimeout(240_000);
    const fixture = `http://localhost:${process.env.SMOKE_FIXTURE_PORT ?? "54321"}`;
    expect((await request.post(`${fixture}/__smoke__/mode`, { data: { mode: "empty" } })).ok()).toBeTruthy();
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const route of routes) {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status(), route).toBe(200);
      await expect(page.locator("main#main"), route).toBeVisible();
      await expect(page.locator("main#main h1").first(), route).toBeVisible();
      const size = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
      expect(Math.max(size.document, size.body), route).toBeLessThanOrEqual(size.viewport + 1);
    }
  });
}

test("newsletter signup is paused on home and radio reminders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("Email address").first()).toBeDisabled();
  await expect(page.getByRole("button", { name: "Subscribe" }).first()).toBeDisabled();
  await page.goto("/radio/reminders");
  await expect(page.getByRole("button", { name: "Subscribe" }).first()).toBeDisabled();
});

test("history search remains editable", async ({ page }) => {
  await page.goto("/itan-ilu-mi?q=initial");
  const search = page.getByLabel("Family name or community");
  await search.fill("updated");
  await expect(search).toHaveValue("updated");
  await page.getByRole("button", { name: "Search published records" }).click();
  await expect(page).toHaveURL(/q=updated/);
});


test("history pagination keeps the selected search and returns to the first page", async ({ page, request }) => {
  const fixture = `http://localhost:${process.env.SMOKE_FIXTURE_PORT ?? "54321"}`;
  expect((await request.post(`${fixture}/__smoke__/mode`, { data: { mode: "history" } })).ok()).toBeTruthy();
  await page.goto("/itan-ilu-mi?category=community-history");
  await expect(page.getByRole("heading", { name: "Synthetic history 1", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Synthetic history 11", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Next page" }).click();
  await expect(page).toHaveURL(/category=community-history&page=2/);
  await expect(page.getByRole("heading", { name: "Synthetic history 11", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Previous page" }).click();
  await expect(page.getByRole("heading", { name: "Synthetic history 1", exact: true })).toBeVisible();
  await request.post(`${fixture}/__smoke__/mode`, { data: { mode: "empty" } });
});

test("radio keeps listening separate from listings and reminder settings", async ({ page, request, context }) => {
  const fixture = `http://localhost:${process.env.SMOKE_FIXTURE_PORT ?? "54321"}`;
  await request.post(`${fixture}/__smoke__/mode`, { data: { mode: "empty" } });
  await context.grantPermissions(["notifications"]);
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/radio");
    await expect(page.getByRole("region", { name: "Radio stations" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Keep exploring" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Schedule", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Programmes & schedule/ })).toHaveAttribute("href", "/radio/programmes");
    const size = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
    expect(size.document).toBeLessThanOrEqual(size.viewport + 1);
  }
  await page.getByRole("link", { name: /Programmes & schedule/ }).click();
  await expect(page).toHaveURL(/\/radio\/programmes$/);
  await expect(page.getByRole("heading", { name: "Programmes and archive" })).toBeVisible();
  // Reminder settings are reached through the header bell's Notification Centre.
  await page.getByRole("button", { name: /^Notifications/ }).click();
  await page.getByRole("dialog", { name: "Notifications" }).getByRole("link", { name: "Thursday radio reminder" }).click();
  await expect(page).toHaveURL(/\/radio\/reminders$/);
  await expect(page.getByText(/Works only while this site is open/)).toBeVisible();
  await page.getByRole("button", { name: "Enable alert" }).click();
  await expect(page.getByRole("button", { name: "Disable alert" })).toBeVisible();
  await page.getByRole("button", { name: "Disable alert" }).click();
});
