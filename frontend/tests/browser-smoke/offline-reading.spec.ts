import { expect, test } from "@playwright/test";

const fixture = `http://localhost:${process.env.SMOKE_FIXTURE_PORT ?? "54321"}`;

test("a deliberately saved article reopens without a network connection", async ({ page, request, context }) => {
  const mode = await request.post(`${fixture}/__smoke__/mode`, { data: { mode: "stories" } });
  expect(mode.ok()).toBe(true);
  await page.addInitScript(() => localStorage.setItem("epelawa_cookie_consent", "true"));
  try {
    const path = "/news/smoke-market-story";
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: "Smoke fixture: market story" })).toBeVisible();
    await page.getByText("More story options", { exact: true }).click();
    await page.getByRole("button", { name: "Save for offline reading" }).click();
    await expect(page.getByText(/Saved on this device/)).toBeVisible();

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Smoke fixture: market story" })).toBeVisible();
    await expect(page.getByText("Second published paragraph.")).toBeVisible();
    await expect(page.getByText(/images, later updates and corrections are not included/i)).toBeVisible();
    await expect(page.locator("script")).toHaveCount(0);

    await context.setOffline(false);
    expect((await request.post(`${fixture}/__smoke__/mode`, { data: { mode: "empty" } })).ok()).toBe(true);
    const online = await page.reload();
    expect(online?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found.", level: 1 })).toBeVisible();
  } finally {
    await context.setOffline(false);
    await request.post(`${fixture}/__smoke__/mode`, { data: { mode: "empty" } });
  }
});
