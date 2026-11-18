// @vitest-environment jsdom
import { expect, it, vi, afterEach } from "vitest";
import { buildShareCover } from "../apps/main/lib/share-cover";
afterEach(() => vi.unstubAllGlobals());

function response(chunks: Uint8Array[], contentType = "image/png", contentLength?: string) {
  const cancel = vi.fn();
  const body = new ReadableStream<Uint8Array>({
    start(controller) { for (const chunk of chunks) controller.enqueue(chunk); controller.close(); },
    cancel,
  });
  const headers = new Headers({ "content-type": contentType });
  if (contentLength !== undefined) headers.set("content-length", contentLength);
  return { ok: true, headers, body, cancel };
}
it("builds an image file from a successful browser CORS response", async () => {
  const fetch = vi.fn().mockResolvedValue(response([new TextEncoder().encode("cover bytes")]));
  vi.stubGlobal("fetch", fetch);
  const file = await buildShareCover("/brand-logo.png");
  expect(file?.name).toBe("epe-lawa-cover.png");
  expect(file?.type).toBe("image/png");
  expect(fetch.mock.calls[0][1]).toMatchObject({ mode: "cors", credentials: "omit", referrerPolicy: "no-referrer" });
});
it("rejects HTML, declared oversized bodies and insecure remote URLs", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(response([new Uint8Array(1)], "text/html")).mockResolvedValueOnce(response([new Uint8Array(1)], "image/png", "8388609"));
  vi.stubGlobal("fetch", fetch);
  expect(await buildShareCover("https://example.com/page")).toBeNull();
  expect(await buildShareCover("https://example.com/large.png")).toBeNull();
  expect(await buildShareCover("http://example.com/image.png")).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("stops consuming a body that exceeds the limit without a trustworthy length", async () => {
  let reads = 0;
  const cancel = vi.fn().mockResolvedValue(undefined);
  const releaseLock = vi.fn();
  const body = { getReader: () => ({ read: async () => { reads++; return { done: false, value: new Uint8Array(1024 * 1024) }; }, cancel, releaseLock }) };
  const fetch = vi.fn().mockResolvedValue({ ok: true, headers: new Headers({ "content-type": "image/png", "content-length": "1" }), body });
  vi.stubGlobal("fetch", fetch);
  expect(await buildShareCover("https://example.com/image.png")).toBeNull();
  expect(reads).toBe(9);
  expect(cancel).toHaveBeenCalledOnce();
  expect(releaseLock).toHaveBeenCalledOnce();
});
