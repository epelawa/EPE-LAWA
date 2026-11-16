// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetTestPathname, setTestPathname } from "./mocks/next-navigation";
import ScrollToTop from "../apps/main/components/scroll-to-top";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
const scrollTo = vi.fn();

beforeEach(() => {
  resetTestPathname("/");
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  scrollTo.mockClear();
  Object.defineProperty(window, "scrollTo", { configurable: true, value: scrollTo });
  Object.defineProperty(history, "scrollRestoration", { configurable: true, writable: true, value: "auto" });
  window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  }) as typeof window.requestAnimationFrame;
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("ScrollToTop", () => {
  it("scrolls to the top when the pathname changes", () => {
    act(() => root.render(<ScrollToTop />));
    expect(scrollTo).not.toHaveBeenCalled();

    act(() => setTestPathname("/news"));

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "auto" });
  });

  it("does not react to a query-string change on the same pathname", () => {
    resetTestPathname("/dashboard");
    act(() => root.render(<ScrollToTop />));
    act(() => setTestPathname("/dashboard"));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("starts at the top after back/forward traversal", () => {
    act(() => root.render(<ScrollToTop />));
    expect(history.scrollRestoration).toBe("manual");

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "auto" });
  });
});
