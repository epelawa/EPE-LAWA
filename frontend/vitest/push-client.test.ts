// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../apps/main/lib/vapid", () => ({ VAPID_PUBLIC_KEY: "BBnfwKVqawwNNF2nz29Rpz8uFDTw53G5MVsUDpTT2RzN3uChE8_o7L9XTkmHDWuimZqt00qpTLM2NAVLdS0Pay8", WEB_PUSH_READY: true }));

const unsubscribe = vi.fn(async () => true);
const subscription = {
  unsubscribe,
  toJSON: () => ({ endpoint: "https://jmt17.google.com/fcm/send/abc", keys: { p256dh: "p".repeat(87), auth: "a".repeat(22) } }),
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  unsubscribe.mockClear();
  Object.defineProperty(window, "isSecureContext", { value: true, configurable: true });
  vi.stubGlobal("Notification", { permission: "default", requestPermission: vi.fn(async () => "granted") });
  vi.stubGlobal("PushManager", function PushManager() {});
  const reg = { pushManager: { getSubscription: vi.fn(async () => subscription), subscribe: vi.fn() } };
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { getRegistration: vi.fn(async () => reg), register: vi.fn(async () => reg), ready: Promise.resolve(reg) } });
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); localStorage.clear(); });

const ok = () => new Response(JSON.stringify({ saved: true, topics: { news: true, radio: false } }), { status: 200 });

describe("enablePush", () => {
  it("retries once after a momentary 503 or dropped connection, so the first try succeeds", async () => {
    const { enablePush } = await import("../apps/main/lib/push-client");
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ error: "temporarily_unavailable" }), { status: 503 })).mockResolvedValueOnce(ok());
    vi.stubGlobal("fetch", fetcher);
    await expect(enablePush({ news: true, radio: false })).resolves.toEqual({ ok: true, topics: { news: true, radio: false } });
    expect(fetcher).toHaveBeenCalledTimes(2);

    const dropped = vi.fn().mockRejectedValueOnce(new TypeError("network")).mockResolvedValueOnce(ok());
    vi.stubGlobal("fetch", dropped);
    await expect(enablePush({ news: true, radio: false })).resolves.toMatchObject({ ok: true });
    expect(dropped).toHaveBeenCalledTimes(2);
  });

  it("explains a persistent outage instead of blaming the settings, and does not retry forever", async () => {
    const { enablePush } = await import("../apps/main/lib/push-client");
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ error: "temporarily_unavailable" }), { status: 503 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(enablePush({ news: true, radio: true })).resolves.toMatchObject({ ok: false, message: "EPE LAWA is briefly unavailable. Please try again in a moment." });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not retry a refused subscription, and drops it so the next try gets a fresh one", async () => {
    const { enablePush } = await import("../apps/main/lib/push-client");
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ saved: false, error: { http_code: 400, message: "Invalid subscription" } }), { status: 400 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(enablePush({ news: true, radio: true })).resolves.toMatchObject({ ok: false, message: "Your settings could not be saved. Please try again." });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
