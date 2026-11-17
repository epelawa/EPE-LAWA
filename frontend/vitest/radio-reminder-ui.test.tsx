// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import RadioReminder from "../apps/main/components/radio-reminder";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => { localStorage.clear(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it("asks permission only when opted in and sends at the flyer time while open", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-19T12:29:45Z"));
  const send = vi.fn();
  class MockNotification {
    static permission = "granted";
    static requestPermission = vi.fn(async () => "granted");
    onclick: (() => void) | null = null;
    constructor(title: string, options: NotificationOptions) { send(title, options); }
    close() {}
  }
  vi.stubGlobal("Notification", MockNotification);
  vi.stubGlobal("isSecureContext", true);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<RadioReminder />));
  expect(MockNotification.requestPermission).not.toHaveBeenCalled();
  await act(async () => { container.querySelector("button")!.click(); });
  expect(MockNotification.requestPermission).toHaveBeenCalledOnce();
  expect(send).not.toHaveBeenCalled();
  await act(async () => { vi.advanceTimersByTime(30_000); });
  expect(send).toHaveBeenCalledOnce();
  await act(async () => { vi.advanceTimersByTime(30_000); });
  expect(send).toHaveBeenCalledOnce();
  await act(async () => { container.querySelector("button")!.click(); });
  expect(localStorage.getItem("epe-radio-open-page-reminder")).toBeNull();
  act(() => root.unmount());
  container.remove();
});
