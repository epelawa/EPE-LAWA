import { expect, test } from "@playwright/test";

// Synthetic fixture: this verifies route rendering, not production providers or writes.
const routes = ["/", "/news", "/about", "/advertise", "/contact", "/business-directory", "/forum", "/gallery", "/guidelines", "/itan-ilu-mi", "/map", "/photo-credits", "/privacy", "/radio", "/terms", "/tourism", "/who-is-who", "/login", "/forgot-password"];
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

test("newsletter clearly remains disabled and collects no address", async ({ page }) => {
  await page.goto("/");
  const note = page.getByText("Sign-up is paused; no email address is collected.").first();
  await expect(note).toBeVisible();
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
