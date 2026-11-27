// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import NotificationCentre from "../apps/main/components/notification-centre";

const readTopics = vi.hoisted(() => vi.fn());
vi.mock("../apps/main/components/radio-reminder", () => ({ useRadioOpenPageReminder: vi.fn() }));
vi.mock("../apps/main/lib/supabase.client", () => ({
  createClient: () => ({ auth: { getSession: async () => ({ data: { session: null } }) } }),
}));
vi.mock("../apps/main/lib/push-client", () => ({
  pushSupport: () => "supported",
  pushPermission: () => "granted",
  readTopics,
  rememberedSubscribed: () => false,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("does not show push as on until the server has confirmed the device", async () => {
  readTopics.mockResolvedValueOnce(null).mockResolvedValueOnce({ subscribed: true, topics: { news: true, radio: false } });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(<NotificationCentre />));
    const dialog = host.querySelector("dialog")!;
    dialog.showModal = () => { dialog.open = true; };

    await act(async () => host.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')!.click());
    expect(dialog.textContent).toContain("Could not check notification settings for this device.");
    expect(dialog.textContent).not.toContain("Turn off on this device");

    const retry = [...dialog.querySelectorAll("button")].find((button) => button.textContent === "Check again")!;
    await act(async () => retry.click());
    expect(dialog.textContent).not.toContain("Could not check notification settings for this device.");
    expect(dialog.textContent).toContain("Turn off on this device");
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});
