// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import NewsFilterClose from "../apps/main/components/news-filter-close";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement;
let root: Root;
let details: HTMLDetailsElement;
let summary: HTMLElement;

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<NewsFilterClose><nav><details><summary>Category</summary><ul><li><a href="#selected"><span>Selected</span></a></li></ul></details></nav></NewsFilterClose>));
  details = host.querySelector("details")!;
  summary = host.querySelector("summary")!;
  details.open = true;
});
afterEach(() => { act(() => root.unmount()); host.remove(); });

describe("news category disclosure", () => {
  it("closes when a category is selected, including its child content", () => {
    const span = host.querySelector("a span")!;
    act(() => span.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
    expect(details.open).toBe(false);
  });
  it("closes on Escape and restores focus to the summary", () => {
    const link = host.querySelector("a")!;
    link.focus();
    act(() => link.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(details.open).toBe(false);
    expect(document.activeElement).toBe(summary);
  });
  it("closes when the reader points outside but not when pointing inside", () => {
    act(() => summary.dispatchEvent(new Event("pointerdown", { bubbles: true })));
    expect(details.open).toBe(true);
    act(() => document.body.dispatchEvent(new Event("pointerdown", { bubbles: true })));
    expect(details.open).toBe(false);
  });
});
