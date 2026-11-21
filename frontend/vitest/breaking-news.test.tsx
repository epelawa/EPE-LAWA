// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { BreakingBadge, BreakingNewsBanner } from "../apps/main/components/breaking-news";
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
it("shows only unexpired stories and removes the banner and badge when time expires", () => {
  vi.useFakeTimers();
  const now = new Date("2026-11-16T12:00:00Z").getTime(); vi.setSystemTime(now);
  const future = new Date(now + 1000).toISOString();
  const stories = [
    { slug: "active", title: "Synthetic active story", published_at: null, breaking_until: future },
    { slug: "expired", title: "Synthetic expired story", published_at: null, breaking_until: new Date(now - 1).toISOString() },
  ];
  const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
  try {
    act(() => root.render(<><BreakingNewsBanner stories={stories} initialTime={now} /><BreakingBadge until={future} initialTime={now} /></>));
    expect(host.querySelector("a")?.getAttribute("href")).toBe("/news/active");
    expect(host.textContent).not.toContain("Synthetic expired story");
    expect(host.textContent).toContain("Breaking");
    expect(host.querySelectorAll("ul")).toHaveLength(2);
    expect(host.querySelector("ul[aria-hidden='true']")?.querySelectorAll("a[tabindex='-1']").length).toBe(1);
    act(() => { vi.advanceTimersByTime(1001); });
    expect(host.querySelector('[aria-label="Breaking news"]')).toBeNull();
    expect(host.textContent).not.toContain("Breaking");
  } finally { act(() => root.unmount()); host.remove(); vi.useRealTimers(); }
});
it("slides several breaking stories in one duplicated track", () => {
  vi.useFakeTimers();
  const now = new Date("2026-11-16T12:00:00Z").getTime(); vi.setSystemTime(now);
  const future = new Date(now + 1000).toISOString();
  const stories = [
    { slug: "one", title: "Synthetic first story", published_at: null, breaking_until: future },
    { slug: "two", title: "Synthetic second story", published_at: null, breaking_until: future },
  ];
  const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
  try {
    act(() => root.render(<BreakingNewsBanner stories={stories} initialTime={now} />));
    const links = [...host.querySelectorAll("a")].map(link => link.getAttribute("href"));
    expect(links.filter(href => href === "/news/one")).toHaveLength(2);
    expect(links.filter(href => href === "/news/two")).toHaveLength(2);
  } finally { act(() => root.unmount()); host.remove(); vi.useRealTimers(); }
});
it("expires member cards and shows the honest empty state", async () => {
  const { ExpiringBreakingList } = await import("../apps/main/components/breaking-news");
  vi.useFakeTimers(); const now = Date.now();
  const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
  try {
    act(() => root.render(<ExpiringBreakingList className="list" emptyClassName="empty" initialTime={now} items={[{ id: "one", until: new Date(now + 500).toISOString(), content: <span>Synthetic card</span> }]} />));
    expect(host.textContent).toContain("Synthetic card");
    act(() => vi.advanceTimersByTime(501));
    expect(host.textContent).toContain("There are no active breaking stories right now.");
    expect(host.textContent).not.toContain("Synthetic card");
  } finally { act(() => root.unmount()); host.remove(); vi.useRealTimers(); }
});
