// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

// Turn 4 owner brief: radio reminders are real background push notifications scheduled by the
// database (push_radio_tick via pg_cron), not an open-page timer. What must still hold:
// nothing asks for permission on render, permission is requested only after a click, and
// turning the reminder off clears the legacy open-page setting so nobody gets two alerts.
const push = vi.hoisted(() => ({
  pushSupport: vi.fn(() => "supported"),
  pushPermission: vi.fn(() => "default"),
  readTopics: vi.fn(async () => null),
  currentSubscription: vi.fn(async () => null),
  enablePush: vi.fn(async (topics: { news: boolean; radio: boolean }) => ({ ok: true, topics })),
  saveTopics: vi.fn(async (topics: { news: boolean; radio: boolean }) => ({ ok: true, topics })),
  disablePush: vi.fn(async () => ({ ok: true, topics: { news: false, radio: false } })),
}));
vi.mock("../apps/main/lib/push-client", () => push);
vi.mock("../apps/main/components/notification-sound", () => ({ NotificationSoundSettings: () => null }));
import RadioReminder, { RadioReminderSettings } from "../apps/main/components/radio-reminder";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { localStorage.clear(); vi.unstubAllGlobals(); });

it("asks permission only after a click and subscribes this device to the radio topic", async () => {
  localStorage.setItem("epe-radio-open-page-reminder", "on");
  const requestPermission = vi.fn(async () => "granted");
  vi.stubGlobal("Notification", class { static permission = "default"; static requestPermission = requestPermission; });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<><RadioReminder /><RadioReminderSettings /></>));
  expect(requestPermission).not.toHaveBeenCalled();
  expect(push.enablePush).not.toHaveBeenCalled();
  expect(localStorage.getItem("epe-radio-open-page-reminder")).toBeNull();
  expect(container.textContent).toContain("sent automatically the moment a scheduled EPE LAWA programme goes on air");
  expect(container.textContent).not.toMatch(/works while this site is open/i);

  const turnOn = [...container.querySelectorAll("button")].find((b) => b.textContent === "Turn on radio notifications")!;
  await act(async () => { turnOn.click(); });
  expect(push.enablePush).toHaveBeenCalledOnce();
  expect(push.enablePush).toHaveBeenCalledWith({ news: false, radio: true });
  expect(container.textContent).toContain("Radio notifications are on for this device.");

  const turnOff = [...container.querySelectorAll("button")].find((b) => b.textContent === "Turn off radio notifications")!;
  await act(async () => { turnOff.click(); });
  expect(push.disablePush).toHaveBeenCalledOnce();
  expect(container.textContent).toContain("Radio notifications are off for this device.");
  act(() => root.unmount());
  container.remove();
});
