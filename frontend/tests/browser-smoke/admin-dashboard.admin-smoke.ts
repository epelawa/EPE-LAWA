import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { readAdminSessionFromCookies } from "../../apps/admin/lib/supabase-access.ts";

const controlURL = `http://127.0.0.1:${process.env.ADMIN_SMOKE_CONTROL_PORT ?? "5444"}`;
const baseURL = process.env.ADMIN_SMOKE_BASE_URL ?? "https://localhost:3102";
const syntheticUserId = "11111111-1111-4111-8111-111111111111";

async function setMode(request: APIRequestContext, mode: "authorized-error" | "denied" | "capability-error") {
  const response = await request.post(`${controlURL}/__admin-smoke__/mode`, { data: { mode } });
  expect(response.ok(), `local fixture should accept mode ${mode}`).toBeTruthy();
}

async function addSyntheticStaffSession(page: Page) {
  const session = {
    access_token: "local-admin-dashboard-smoke-token",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: syntheticUserId, aud: "authenticated" },
  };
  await page.context().addCookies([{
    name: "__Host-epelawa-admin",
    value: Buffer.from(JSON.stringify(session)).toString("base64url"),
    url: baseURL,
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
  }]);
  const storedCookies = await page.context().cookies(baseURL);
  expect(storedCookies.some((cookie) => cookie.name === "__Host-epelawa-admin" && cookie.secure)).toBe(true);
  expect(readAdminSessionFromCookies(storedCookies)).toMatchObject({
    access_token: "local-admin-dashboard-smoke-token",
    user: { id: syntheticUserId },
  });
}

async function expectNoHorizontalOverflow(page: Page, width: number) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(Math.max(dimensions.document, dimensions.body), `dashboard at ${width}px should not overflow`).toBeLessThanOrEqual(dimensions.viewport + 1);
}

async function tabUntilFocused(page: Page, target: Locator, maxTabs = 40) {
  for (let attempt = 0; attempt < maxTabs; attempt += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error("Could not reach the dashboard workflow using keyboard navigation.");
}

async function capture(page: Page, name: string) {
  const directory = process.env.ADMIN_DASHBOARD_SCREENSHOT_DIR;
  if (!directory) return;
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: resolve(directory, name), fullPage: true });
}

async function waitForSitePreloader(page: Page) {
  await expect(page.locator(".site-preloader")).toHaveCSS("visibility", "hidden");
}

test.afterAll(() => {
  const appEnvPath = resolve(process.cwd(), "frontend/apps/main/.env.local");
  if (!existsSync(appEnvPath)) return;
  const contents = readFileSync(appEnvPath, "utf8");
  if (!contents.includes("SUPABASE_PUBLISHABLE_KEY=sb_publishable_local-admin-dashboard-only")) {
    throw new Error("Admin smoke will not remove a non-synthetic app env file.");
  }
  rmSync(appEnvPath);
});

test("authorized Admin dashboard keeps unavailable counts honest and exposes only verified workflows", async ({ page, request }) => {
  await setMode(request, "authorized-error");
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await addSyntheticStaffSession(page);
  const staffCookieRequest = page.waitForRequest(async (request) => {
    if (new URL(request.url()).pathname !== "/admin") return false;
    const headers = await request.allHeaders();
    return headers.cookie?.includes("__Host-epelawa-admin=") ?? false;
  });
  await page.goto("/admin");
  await staffCookieRequest;
  await waitForSitePreloader(page);
  const verificationLogResponse = await request.get(`${controlURL}/__admin-smoke__/requests`);
  const verificationLog = await verificationLogResponse.json() as string[];
  expect(verificationLog).toContain("GET /auth/v1/user");
  expect(verificationLog).toContain("GET /rest/v1/staff_profiles");

  await expect(page.getByRole("heading", { level: 1, name: "Admin dashboard" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Work queues" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Workflows available to your role" })).toBeVisible();
  const metricValues = page.locator('[class*="metricValue"]');
  await expect(metricValues).toHaveCount(4);
  await expect(metricValues).toHaveText(["Unavailable", "Unavailable", "Unavailable", "Unavailable"]);
  await expect(page.getByText("Verified count", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Create a private draft/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Open the newsroom/ })).toHaveAttribute("href", "/admin/newsroom");
  await expect(page.getByRole("link", { name: /Forum moderation/ })).toHaveAttribute("href", "/admin/moderation/forum");
  await expect(page.getByRole("link", { name: /History review/ })).toHaveAttribute("href", "/admin/itan-ilu-mi/review");
  await expect(page.getByRole("link", { name: /Order operations/ })).toHaveAttribute("href", "/admin/orders");
  await expect(page.getByRole("link", { name: /Staff roles and accounts/ })).toHaveAttribute("href", "/admin/roles");
  await expect(page.getByText("Counts only, no private records.")).toBeVisible();
  await expectNoHorizontalOverflow(page, 1440);

  const draftLink = page.getByRole("link", { name: /Create a private draft/ }).first();
  await tabUntilFocused(page, draftLink);
  await expect(draftLink).toBeFocused();
  await capture(page, "admin-dashboard-desktop-1440x900.png");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await waitForSitePreloader(page);
  await expect(page.getByRole("heading", { level: 1, name: "Admin dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Create a private draft/ })).toBeVisible();
  await expectNoHorizontalOverflow(page, 390);
  await capture(page, "admin-dashboard-mobile-390x844.png");
});

test("denied capabilities hide dashboard shortcuts and never expose queue counts", async ({ page, request }) => {
  await setMode(request, "denied");
  await page.emulateMedia({ colorScheme: "light" });
  await addSyntheticStaffSession(page);
  await page.goto("/admin");

  await expect(page.getByRole("heading", { level: 1, name: "Admin dashboard" })).toBeVisible();
  await expect(page.locator('[class*="metricValue"]')).toHaveText(["Unavailable", "Unavailable", "Unavailable", "Unavailable"]);
  await expect(page.getByText("Access restricted", { exact: true })).toHaveCount(4);
  await expect(page.getByRole("link", { name: /Create a private draft/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Forum moderation/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Staff roles and accounts/ })).toHaveCount(0);
  await expect(page.getByText("No dashboard shortcuts were confirmed for this request.", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page, 1440);
});

test("failed permission checks produce unavailable state, not guessed access or a zero", async ({ page, request }) => {
  await setMode(request, "capability-error");
  await addSyntheticStaffSession(page);
  await page.goto("/admin");

  await expect(page.getByRole("heading", { level: 1, name: "Admin dashboard" })).toBeVisible();
  await expect(page.locator('[class*="metricValue"]')).toHaveText(["Unavailable", "Unavailable", "Unavailable", "Unavailable"]);
  await expect(page.getByText("Unavailable", { exact: true })).toHaveCount(8);
  await expect(page.getByRole("link", { name: /Create a private draft/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Staff roles and accounts/ })).toBeVisible();
});
