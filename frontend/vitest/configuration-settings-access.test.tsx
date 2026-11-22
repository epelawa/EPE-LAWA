import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ rpc: vi.fn(), createClient: vi.fn(), inventory: vi.fn() }));
vi.mock("../apps/admin/lib/supabase", () => ({ createClient: mock.createClient, createStaffClient: mock.createClient }));
vi.mock("../apps/admin/lib/configuration-inventory", () => ({ configurationStatus: mock.inventory }));
import SettingsPage from "../apps/admin/app/(protected)/settings/page";
// The page is a Next server component and now requires its async searchParams
// prop; supply the same empty object Next passes for a bare /admin/settings.
const pageProps = { searchParams: Promise.resolve({}) };
beforeEach(() => { vi.resetAllMocks(); mock.createClient.mockResolvedValue({ rpc: mock.rpc }); mock.inventory.mockReturnValue([{ group: "Email", name: "AUTH_EMAIL_FROM", guide: "Sender guidance", status: "missing" }]); });
describe("deployment settings authorization", () => {
  it.each([{ data: false, error: null }, { data: true, error: { message: "failure" } }])("fails closed before reading configuration", async result => {
    mock.rpc.mockResolvedValue(result);
    const markup = renderToStaticMarkup(await SettingsPage(pageProps));
    expect(markup).toContain("restricted"); expect(mock.inventory).not.toHaveBeenCalled();
  });
  it("shows only checklist metadata after primary administrator authorization", async () => {
    mock.rpc.mockResolvedValue({ data: true, error: null });
    const markup = renderToStaticMarkup(await SettingsPage(pageProps));
    expect(markup).toContain("AUTH_EMAIL_FROM"); expect(markup).toContain("Not set"); expect(markup).not.toContain("Sender guidance"); expect(markup).toContain("not verified"); expect(mock.rpc).toHaveBeenCalledWith("staff_roles_authorized");
  });
  it("fails closed on authorization exception", async () => {
    mock.createClient.mockRejectedValue(new Error("offline"));
    await expect(SettingsPage(pageProps)).rejects.toThrow("offline");
    expect(mock.inventory).not.toHaveBeenCalled();
  });
});
