import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

// Phone, phablet, tablet, landscape tablet and desktop: the guide must read the
// same way on all of them (owner report: the arrow hid beneath the card on mobile).
// Dev builds read NEXT_PUBLIC_* at runtime, so the smoke browser cannot take the
// organic eligibility path; the smoke layout passes smokeTest and this spec opens
// the working-phase modal directly through the ?push-smoke=working parameter.
const devices = [
  { label: "320x740", width: 320, height: 740 },
  { label: "375x812", width: 375, height: 812 },
  { label: "768x1024", width: 768, height: 1024 },
  { label: "1024x768", width: 1024, height: 768 },
  { label: "1440x900", width: 1440, height: 900 },
] as const;

async function captureEvidence(page: Page, label: string) {
  const directory = process.env.SMOKE_SCREENSHOT_DIR;
  if (!directory) return;
  await mkdir(directory, { recursive: true });
  const prefix = (process.env.SMOKE_EVIDENCE_LABEL ?? "local").replace(/[^a-zA-Z0-9._-]/g, "-");
  await page.screenshot({ path: resolve(directory, `${prefix}-push-guide-${label}.png`) });
}

test("the permission guide arrow stays above the card on every device", async ({ page }) => {
  test.setTimeout(180_000);
  const overlay = page.locator("[data-push-onboarding]");
  const card = overlay.getByRole("dialog");
  const guide = overlay.locator("div[class*='permissionGuide']");
  const arrow = guide.locator("path[class*='guideArrow']");

  await page.addInitScript(() => {
    localStorage.setItem("epelawa_cookie_consent", "true");
  });

  for (const device of devices) {
    await page.setViewportSize({ width: device.width, height: device.height });
    await page.goto("/?push-smoke=working");

    await expect(card, `card shows at ${device.label}`).toBeVisible();
    await expect(guide, `guide shows at ${device.label}`).toBeVisible();
    await expect(arrow, `arrow shows at ${device.label}`).toBeVisible();

    const guideBox = await guide.boundingBox();
    const cardBox = await card.boundingBox();
    const arrowBox = await arrow.boundingBox();
    expect(guideBox && cardBox && arrowBox, `geometry at ${device.label}`).toBeTruthy();
    expect(guideBox!.height, `guide keeps a usable strip at ${device.label}`).toBeGreaterThanOrEqual(90);
    expect(guideBox!.y, `guide stays inside the viewport at ${device.label}`).toBeGreaterThanOrEqual(0);
    expect(guideBox!.y + guideBox!.height, `guide ends above the card at ${device.label}`).toBeLessThanOrEqual(cardBox!.y + 1);
    expect(arrowBox!.y + arrowBox!.height, `arrow ends above the card at ${device.label}`).toBeLessThanOrEqual(cardBox!.y + 1);
    await captureEvidence(page, device.label);
  }
});
