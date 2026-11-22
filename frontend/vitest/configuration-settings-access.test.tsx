import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ rpc: vi.fn(), createClient: vi.fn(), readiness: vi.fn() }));
vi.mock("../apps/admin/lib/supabase", () => ({ createClient: mock.createClient, createStaffClient: mock.createClient }));
vi.mock("../apps/admin/lib/system-status", () => ({ systemReadiness: mock.readiness }));
import SettingsPage from "../apps/admin/app/(protected)/settings/page";
// The page is a Next server component and now requires its async searchParams
// prop; supply the same empty object Next passes for a bare /admin/settings.
const pageProps = { searchParams: Promise.resolve({}) };
beforeEach(() => {
  vi.resetAllMocks();
  mock.createClient.mockResolvedValue({ rpc: mock.rpc });
  mock.readiness.mockReturnValue([
    { label: "Database backups", description: "Snapshot listing is ready on the backups desk.", state: "ready", missing: [], set: ["R2_ACCOUNT_ID", "R2_BUCKET_PRIVATE", "CLOUDFLARE_API_TOKEN"], href: "/backups" },
    { label: "Backup automation", description: "Dispatching snapshots needs the remaining workflow variables.", state: "incomplete", missing: ["BACKUP_DISPATCH_TOKEN"], set: ["BACKUP_WORKFLOW_REPO"], href: "/backups" },
  ]);
});
describe("settings authorization and status surface", () => {
  it.each([{ data: false, error: null }, { data: true, error: { message: "failure" } }])("fails closed before reading status", async result => {
    mock.rpc.mockResolvedValue(result);
    const markup = renderToStaticMarkup(await SettingsPage(pageProps));
    expect(markup).toContain("restricted"); expect(mock.readiness).not.toHaveBeenCalled();
  });
  it("shows status tiles with variable names only after authorization", async () => {
    mock.rpc.mockResolvedValue({ data: true, error: null });
    const markup = renderToStaticMarkup(await SettingsPage(pageProps));
    expect(markup).toContain("Database backups"); expect(markup).toContain("BACKUP_DISPATCH_TOKEN");
    expect(markup).toContain("presence only"); expect(markup).not.toContain("secret-token-value");
    expect(mock.rpc).toHaveBeenCalledWith("staff_roles_authorized");
  });
  it("fails closed on authorization exception", async () => {
    mock.createClient.mockRejectedValue(new Error("offline"));
    await expect(SettingsPage(pageProps)).rejects.toThrow("offline");
    expect(mock.readiness).not.toHaveBeenCalled();
  });
});
