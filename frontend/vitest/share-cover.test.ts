// @vitest-environment jsdom
import { expect, it, vi, afterEach } from "vitest";
import { buildShareCover } from "../apps/main/lib/share-cover";
afterEach(() => vi.unstubAllGlobals());
it("builds an image file from a successful browser CORS response", async () => {
  const blob = new Blob(["cover bytes"], { type: "image/png" });
  const fetch = vi.fn().mockResolvedValue({ ok: true, headers: new Headers(), blob: () => Promise.resolve(blob) });
  vi.stubGlobal("fetch", fetch);
  const file = await buildShareCover("/brand-logo.png");
  expect(file?.name).toBe("epe-lawa-cover.png");
  expect(file?.type).toBe("image/png");
  expect(fetch.mock.calls[0][1]).toMatchObject({ mode: "cors", credentials: "omit", referrerPolicy: "no-referrer" });
});
it("does not attach HTML, large files or insecure remote URLs", async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, headers: new Headers(), blob: () => Promise.resolve(new Blob(["bad"], { type: "text/html" })) });
  vi.stubGlobal("fetch", fetch);
  expect(await buildShareCover("https://example.com/page")).toBeNull();
  expect(await buildShareCover("http://example.com/image.png")).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(1);
});
