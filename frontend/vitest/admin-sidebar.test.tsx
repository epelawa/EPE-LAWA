// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import AdminSidebar from "../apps/admin/components/admin-sidebar";

vi.mock("next/navigation", () => ({ usePathname: () => "/newsroom" }));
vi.mock("../apps/admin/components/admin-link", () => ({
  default: ({ children, pendingLabel: _pendingLabel, ...props }: React.ComponentProps<"a"> & { pendingLabel?: string }) => (
    <a {...props} onClick={(event) => { event.preventDefault(); props.onClick?.(event); }}>{children}</a>
  ),
}));
vi.mock("../apps/admin/components/use-live-queue-counts", () => ({
  useLiveQueueCounts: () => ({ counts: null, flick: null }),
}));
vi.mock("../apps/admin/lib/session-actions", () => ({ signOutStaffSameOrigin: vi.fn() }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("closes the drawer and restores focus for current and other page links", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(<AdminSidebar items={[
      { label: "Newsroom", href: "/newsroom", group: "PEOPLE & WORK" },
      { label: "Upload Article", href: "/newsroom/new", group: "PEOPLE & WORK" },
    ]} />));
    const trigger = host.querySelector<HTMLButtonElement>(".admin-menu-button")!;
    const drawer = host.querySelector<HTMLDivElement>(".drawer-root")!;
    for (const label of ["Newsroom", "Upload Article"]) {
      await act(async () => trigger.click());
      expect(drawer.dataset.open).toBe("true");
      expect(document.body.style.overflow).toBe("hidden");
      const link = [...drawer.querySelectorAll("nav a")].find((item) => item.textContent?.includes(label));
      expect(link).toBeDefined();
      await act(async () => link!.click());
      expect(drawer.dataset.open).toBe("false");
      expect(document.body.style.overflow).toBe("");
      expect(document.activeElement).toBe(trigger);
    }
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});
