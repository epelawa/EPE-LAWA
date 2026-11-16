// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import LayoutVariation from "../apps/main/components/layout-variation";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("layout variation", () => {
  it("changes presentation on a subsequent visit without changing the content", () => {
    sessionStorage.clear();
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    const container = document.createElement("div");
    const first = createRoot(container);
    act(() => first.render(<LayoutVariation area="article"><a href="/news">Story</a></LayoutVariation>));
    expect(container.firstElementChild?.getAttribute("data-layout-variant")).toBe("0");
    act(() => first.unmount());
    const paired = createRoot(container);
    act(() => paired.render(<LayoutVariation area="member"><a href="/news">Story</a></LayoutVariation>));
    expect(container.firstElementChild?.getAttribute("data-layout-variant")).toBe("0");
    act(() => paired.unmount());
    const second = createRoot(container);
    act(() => second.render(<LayoutVariation area="article"><a href="/news">Story</a></LayoutVariation>));
    expect(container.firstElementChild?.getAttribute("data-layout-variant")).toBe("1");
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/news");
    act(() => second.unmount());
  });
});
