import { expect, test } from "@playwright/test";

const fixtureURL = `http://localhost:${process.env.SMOKE_FIXTURE_PORT ?? "54321"}`;

test("light mode ignores old dark preferences and the public drawer keeps only approved account actions", async ({ page, request }, testInfo) => {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /hydrat/i.test(message.text())) hydrationErrors.push(message.text());
  });
  page.on("pageerror", (error) => {
    if (/hydrat/i.test(error.message)) hydrationErrors.push(error.message);
  });
  await request.post(`${fixtureURL}/__smoke__/mode`, { data: { mode: "empty" } });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("epelawa-theme", "dark"));
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await page.locator("html").evaluate((el) => getComputedStyle(el).colorScheme)).toBe("light");
  await expect(page.getByRole("button", { name: /appearance|dark mode|light mode|theme/i })).toHaveCount(0);
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  const drawer = page.getByRole("dialog", { name: "Find your place in Epe." });
  await expect(drawer).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("navigation-drawer.png"), fullPage: false });
  await expect(drawer.locator(".drawer-group")).toHaveCount(4);
  for (const group of ["Read", "Community", "Explore", "EPE LAWA"]) {
    await expect(drawer.getByRole("heading", { name: group, exact: true })).toBeVisible();
  }
  expect(await drawer.locator(".drawer-group h2").allTextContents()).toEqual(["Read", "Community", "Explore", "EPE LAWA"]);
  await expect(drawer.locator('section[aria-labelledby="drawer-read"] a[href="/news"]')).toHaveCount(1);
  await expect(drawer.locator('section[aria-labelledby="drawer-community"] a[href="/forum"]')).toHaveCount(1);
  await expect(drawer.locator('section[aria-labelledby="drawer-explore"] a[href="/map"]')).toHaveCount(1);
  await expect(drawer.locator('section[aria-labelledby="drawer-epe-lawa"] a[href="/photo-credits"]')).toHaveCount(1);
  await expect(drawer.getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/auth");
  await expect(drawer.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  await expect(drawer.getByText(/Appearance|Member dashboard/i)).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(page.getByRole("button", { name: "Open navigation menu" })).toBeFocused();
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await page.getByRole("dialog", { name: "Find your place in Epe." }).locator('a[href="/news"]').click();
  await expect(page).toHaveURL(/\/news$/);
  await expect(page.getByRole("heading", { level: 1, name: "News" })).toBeVisible();
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await page.getByRole("dialog", { name: "Find your place in Epe." }).getByRole("link", { name: "Photo credits", exact: true }).click();
  await expect(page).toHaveURL(/\/photo-credits$/);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("button", { name: /appearance|dark mode|light mode|theme/i })).toHaveCount(0);
  expect(hydrationErrors).toEqual([]);
});

test("direct News entry does not mutate markup before hydration", async ({ page, request }) => {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /hydrat/i.test(message.text())) hydrationErrors.push(message.text());
  });
  page.on("pageerror", (error) => {
    if (/hydrat/i.test(error.message)) hydrationErrors.push(error.message);
  });
  await request.post(`${fixtureURL}/__smoke__/mode`, { data: { mode: "empty" } });
  await page.goto("/news");
  await expect(page.getByRole("heading", { level: 1, name: "News" })).toBeVisible();
  expect(hydrationErrors).toEqual([]);
});

test("phone hero copy and CTA remain visible above the cookie notice", async ({ page, request }) => {
  await request.post(`${fixtureURL}/__smoke__/mode`, { data: { mode: "empty" } });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/");
  const hero = page.locator(".home-hero__visual");
  const title = page.getByRole("heading", { level: 1, name: "Stay Connected, Stay Informed" });
  const actions = page.locator(".home-hero__actions");
  const notice = page.getByRole("region", { name: "Storage notice" });
  await expect(notice).toBeVisible();
  await expect.poll(async () => Number(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--storage-notice-height").replace("px", "")))).toBeGreaterThan(0);
  const [heroBox, titleBox, actionBox, noticeBox] = await Promise.all([hero.boundingBox(), title.boundingBox(), actions.boundingBox(), notice.boundingBox()]);
  expect(heroBox && titleBox && actionBox && noticeBox).toBeTruthy();
  expect(titleBox!.x).toBeGreaterThanOrEqual(heroBox!.x);
  expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(noticeBox!.y);

});

test("connection panel precedes the footer and hero images have no overlay controls", async ({ page, request }, testInfo) => {
  await request.post(`${fixtureURL}/__smoke__/mode`, { data: { mode: "empty" } });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [width, height] of [[320, 800], [375, 900], [768, 900], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    const panel = page.locator(".connection-panel");
    await expect(panel).toBeVisible();
    await expect(panel.getByText("OUR PLACE. OUR VOICES.")).toBeVisible();
    await expect(panel.getByRole("heading", { name: "Good things begin with connection." })).toBeVisible();
    await expect(panel.locator(".connection-panel__icon svg")).toBeVisible();
    await expect(page.getByText("Explore Sections", { exact: true })).toHaveCount(0);
    await expect(page.locator(".home-hero__quicknav")).toHaveCount(0);
    const relation = await panel.evaluate((el) => {
      const footer = document.querySelector(".site-footer");
      return Boolean(footer && (el.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING));
    });
    expect(relation).toBeTruthy();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const pause = page.locator(".home-photo-control__button");
    await expect(pause).toBeDisabled();
    await expect(page.locator(".home-hero__media button")).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath(`home-light-${width}.png`), fullPage: true });
  }
});
