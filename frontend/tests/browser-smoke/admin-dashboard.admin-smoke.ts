import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { readAdminSessionFromCookies } from "../../apps/admin/lib/supabase-access.ts";

const controlURL = `http://127.0.0.1:${process.env.ADMIN_SMOKE_CONTROL_PORT ?? "5444"}`;
const baseURL = process.env.ADMIN_SMOKE_BASE_URL ?? "https://localhost:3102";
const syntheticUserId = "11111111-1111-4111-8111-111111111111";

async function setMode(request: APIRequestContext, mode: "authorized-error" | "denied" | "capability-error" | "workspace") {
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
  await expect(page.locator(".site-preloader")).toBeHidden();
}

test("authorized Admin dashboard shows unavailable counts and permitted workflows", async ({ page, request }) => {
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

  await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Dashboard counts" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Dashboard counts" }).getByRole("heading")).toHaveText([
    "Waiting to be published", "Drafts in progress", "Reports to check",
  ]);
  await expect(page.locator('[class*="metricValue"]')).toHaveText(["—", "—", "—"]);
  await expect(page.getByText("Cannot check", { exact: true })).toHaveCount(3);
  await expect(page.getByText("Live count", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Verified count", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Workspace shortcuts" }).getByRole("link", { name: /Newsroom/ })).toBeVisible();
  await expect(page.getByText("Counts only, no private records.")).toHaveCount(0);
  await expectNoHorizontalOverflow(page, 1440);

  const draftLink = page.getByRole("link", { name: "Write a new story" }).first();
  await tabUntilFocused(page, draftLink);
  await expect(draftLink).toBeFocused();
  await capture(page, "admin-dashboard-desktop-1440x900.png");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await waitForSitePreloader(page);
  await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Write a new story" })).toBeVisible();
  await expectNoHorizontalOverflow(page, 390);
  await page.getByRole("button", { name: "Open menu" }).click();
  const drawer = page.getByRole("dialog", { name: "Your workspace" });
  await expect(drawer).toBeVisible();
  await drawer.getByRole("link", { name: /^Newsroom\b/ }).click();
  await expect(page).toHaveURL(/\/admin\/newsroom$/);
  await capture(page, "admin-dashboard-mobile-390x844.png");
});

test("denied capabilities hide dashboard shortcuts and never expose queue counts", async ({ page, request }) => {
  await setMode(request, "denied");
  await page.emulateMedia({ colorScheme: "light" });
  await addSyntheticStaffSession(page);
  await page.goto("/admin");

  await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();
  await expect(page.locator('[class*="metricValue"]')).toHaveText(["—", "—", "—"]);
  await expect(page.getByText("No access", { exact: true })).toHaveCount(3);
  await expect(page.getByText("Live count", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Write a new story" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Forum moderation/ })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Staff sections" }).getByRole("link", { name: /^(Roles|Staff users)$/ })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Workspace shortcuts" }).getByRole("link")).toHaveCount(0);
  await expectNoHorizontalOverflow(page, 1440);
});

test("failed permission checks produce unavailable state, not guessed access or a zero", async ({ page, request }) => {
  await setMode(request, "capability-error");
  await addSyntheticStaffSession(page);
  await page.goto("/admin");

  await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();
  await expect(page.locator('[class*="metricValue"]')).toHaveText(["—", "—", "—"]);
  await expect(page.getByText("Cannot check", { exact: true })).toHaveCount(3);
  await expect(page.getByRole("region", { name: "Workspace shortcuts" }).getByRole("link")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Write a new story" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Staff roles and accounts/ })).toHaveCount(0);
});

test("staff routes render at each supported width and preset hashtags remain editable", async ({ page, request }) => {
  test.setTimeout(240_000);
  await setMode(request, "workspace");
  await addSyntheticStaffSession(page);
  const widths = [320, 375, 768, 1024, 1440];
  const routes = [
    "", "/dashboard", "/analytics", "/media", "/radio", "/newsroom/new", "/newsroom", "/newsroom/settings",
    "/itan-ilu-mi/review", "/corrections", "/people", "/business-review", "/business-review/moderation",
    "/tourism", "/events", "/ads", "/moderation/forum", "/moderation/comments", "/appeals",
    "/enquiries", "/members", "/users", "/roles", "/broadcast", "/site-pages", "/legal-pages",
    "/backups", "/settings", "/settings/cron",
  ];
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [index, route] of routes.entries()) {
    const width = widths[index % widths.length];
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto(`/admin${route}`);
    expect(response?.status(), route).toBe(200);
    expect(new URL(page.url()).pathname).toBe(`/admin${route}`);
    await expect(page.locator(".admin-shell__content").getByRole("heading", { level: 1 }).first(), route).toBeVisible();
    await expect(page.getByRole("heading", { name: "This page could not be loaded" }), route).toHaveCount(0);
    await expectNoHorizontalOverflow(page, width);
  }
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/admin/newsroom/new");
  const presets = page.locator("details").filter({ has: page.getByText("Browse 150 preset hashtags") });
  await presets.locator("summary").click();
  await expect(presets.getByRole("button")).toHaveCount(150);
  await presets.getByRole("searchbox", { name: "Search preset hashtags" }).fill("presidency");
  await expect(presets.getByRole("button", { name: "#Presidency", exact: true })).toBeVisible();
  await expect(presets.getByRole("button", { name: "#EpeNews", exact: true })).toHaveCount(0);
  await presets.getByRole("searchbox", { name: "Search preset hashtags" }).fill("");
  const tag = presets.getByRole("button", { name: "#EpeNews", exact: true });
  await tag.click();
  await expect(tag).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#tags")).toHaveValue("EpeNews");
  await tag.click();
  await expect(page.locator("#tags")).toHaveValue("");
  await expectNoHorizontalOverflow(page, 320);
  await page.locator("#title").fill("Synthetic story");
  await page.locator("#body").fill("Synthetic story body about Epe and climate change.");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.locator("#authorId").selectOption({ label: "Fixture author" });
  await page.locator("#categoryId").selectOption({ label: "Fixture category" });
  await page.getByRole("button", { name: "Preview article" }).click();
  const preview = page.getByRole("dialog", { name: "Review your article" });
  const epeSuggestion = preview.getByRole("button", { name: "#EpeNews", exact: true });
  const climateSuggestion = preview.getByRole("button", { name: "#ClimateChange", exact: true });
  await epeSuggestion.click();
  await expect(epeSuggestion).toHaveAttribute("aria-pressed", "true");
  await climateSuggestion.click();
  await expect(page.locator("#tags")).toHaveValue("EpeNews, ClimateChange");
  await climateSuggestion.click();
  await expect(page.locator("#tags")).toHaveValue("EpeNews");
  await preview.getByRole("button", { name: "Close preview" }).click();
  await page.getByRole("button", { name: "Publish article" }).click();
  await expect(page.getByRole("button", { name: "Publishing article…" })).toBeDisabled();
  await expect(page.getByRole("heading", { level: 1, name: "Synthetic story" })).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/newsroom\/33333333-3333-4333-8333-333333333333\?created=1$/);
  await expectNoHorizontalOverflow(page, 320);
});

test("confirmation can be dismissed or submitted, with one pending action", async ({ page, request }) => {
  await setMode(request, "workspace");
  await addSyntheticStaffSession(page);
  await page.goto("/admin/moderation/comments");
  const trigger = page.getByRole("button", { name: "Save edit" });
  await page.getByLabel(/Edit the comment/).fill("Updated synthetic comment");
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Confirm this action" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await trigger.click();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await trigger.click();
  await dialog.getByRole("button", { name: "Save edit" }).click();
  await expect(page.getByRole("button", { name: "Working…" })).toBeDisabled();
  await expect(page.getByText("The comment was updated on the story.")).toBeVisible();
  const log = await (await request.get(`${controlURL}/__admin-smoke__/requests`)).json() as string[];
  expect(log.filter((entry) => entry === "POST /rest/v1/rpc/comment_staff_update")).toHaveLength(1);
});
