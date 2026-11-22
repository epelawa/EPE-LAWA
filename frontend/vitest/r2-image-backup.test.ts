import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_COMPRESSED_IMAGE_BYTES,
  optimizeUploadedImage,
  toExactArrayBuffer,
} from "../packages/image-optimizer/src/optimize";
import { listBackups, parseBackupListPayload } from "../apps/admin/lib/backup-r2";
import { putMediaObject } from "../apps/main/lib/media-r2";

const avatarEditorPath = new URL("../apps/main/app/dashboard/avatar-editor.tsx", import.meta.url);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function samplePng(width = 3000, height = 1800): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 24, g: 86, b: 164 },
    },
  }).png().toBuffer();
}

describe("R2 image and backup regressions", () => {
  it("parses Cloudflare result arrays and last_modified, excluding checksum sidecars", () => {
    expect(parseBackupListPayload({
      success: true,
      result: [
        {
          key: "db-backups/2026-11-21T120000Z/live.sql.gz",
          size: 4096,
          last_modified: "2026-11-21T12:00:00.000Z",
        },
        {
          key: "db-backups/2026-11-21T120000Z/live.sql.gz.sha256",
          size: 64,
          last_modified: "2026-11-21T12:00:01.000Z",
        },
        { key: "unrelated/file.sql.gz", size: 1, last_modified: "2026-11-21T12:00:00.000Z" },
      ],
    })).toEqual({
      state: "ready",
      backups: [{
        key: "db-backups/2026-11-21T120000Z/live.sql.gz",
        size: 4096,
        uploaded: "2026-11-21T12:00:00.000Z",
      }],
      cursor: null,
      isTruncated: false,
    });
    expect(parseBackupListPayload({ success: true, result: { objects: [] } })).toEqual({ state: "unavailable" });
  });

  it("follows Cloudflare list cursors and returns complete backup rows only", async () => {
    vi.stubEnv("R2_ACCOUNT_ID", "test-account");
    vi.stubEnv("R2_BUCKET_PRIVATE", "test-private");
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "test-token");

    const urls: URL[] = [];
    let requestCount = 0;
    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      urls.push(new URL(String(input)));
      requestCount += 1;
      const body = requestCount === 1
        ? {
            success: true,
            result: [
              { key: "db-backups/2026-11-20T120000Z/live.sql.gz", size: 4096, last_modified: "2026-11-20T12:00:00.000Z" },
              { key: "db-backups/2026-11-20T120000Z/live.sql.gz.sha256", size: 64, last_modified: "2026-11-20T12:00:01.000Z" },
            ],
            result_info: { cursor: "opaque-next-cursor", is_truncated: true, per_page: 1000 },
          }
        : {
            success: true,
            result: [
              { key: "db-backups/2026-11-21T120000Z/live.sql.gz", size: 8192, last_modified: "2026-11-21T12:00:00.000Z" },
            ],
            result_info: { is_truncated: false, per_page: 1000 },
          };
      return new Response(JSON.stringify(body), { status: 200 });
    });

    const result = await listBackups();

    expect(urls).toHaveLength(2);
    expect(urls[0].searchParams.get("prefix")).toBe("db-backups/");
    expect(urls[0].searchParams.get("per_page")).toBe("1000");
    expect(urls[1].searchParams.get("cursor")).toBe("opaque-next-cursor");
    expect(result).toEqual({
      state: "ready",
      backups: [
        { key: "db-backups/2026-11-21T120000Z/live.sql.gz", size: 8192, uploaded: "2026-11-21T12:00:00.000Z" },
        { key: "db-backups/2026-11-20T120000Z/live.sql.gz", size: 4096, uploaded: "2026-11-20T12:00:00.000Z" },
      ],
    });
  });

  it("emits bounded WebP, caps dimensions, and rejects unsupported input MIME types", async () => {
    const optimized = await optimizeUploadedImage(await samplePng(), "image/png");

    expect(optimized.mimeType).toBe("image/webp");
    expect(optimized.extension).toBe(".webp");
    expect(optimized.bytes.byteLength).toBeGreaterThan(0);
    expect(optimized.bytes.byteLength).toBeLessThanOrEqual(MAX_COMPRESSED_IMAGE_BYTES);
    expect([optimized.width, optimized.height]).toEqual([2048, 1229]);
    expect((await sharp(optimized.bytes).metadata()).format).toBe("webp");
    await expect(optimizeUploadedImage(optimized.bytes, "image/svg+xml")).rejects.toThrow("unsupported_image_type");
  });

  it("copies only the visible bytes from a pooled Buffer view into its ArrayBuffer", () => {
    const pooled = Buffer.from([99, 10, 20, 30, 88]);
    const view = pooled.subarray(1, 4);
    const exact = toExactArrayBuffer(view);

    expect(exact.byteLength).toBe(3);
    expect([...new Uint8Array(exact)]).toEqual([10, 20, 30]);
  });

  it("writes exact optimized WebP bytes to the public R2 REST endpoint", async () => {
    vi.stubEnv("R2_ACCOUNT_ID", "test-account");
    vi.stubEnv("R2_BUCKET_PUBLIC", "test-public");
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "test-token");

    let captured: { url: string; init?: RequestInit } | undefined;
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      captured = { url: String(input), init };
      return new Response(null, { status: 200 });
    });

    const source = await samplePng(64, 64);
    const expected = await optimizeUploadedImage(source, "image/png");
    const result = await putMediaObject("media/avatars/test.png", source, "image/png");

    expect(result).toMatchObject({
      state: "ready",
      key: "media/avatars/test.webp",
      mimeType: "image/webp",
      size: expected.bytes.byteLength,
    });
    expect(captured?.url).toMatch(/test\.webp$/);
    const init = captured?.init;
    expect((init?.headers as Record<string, string>)?.["Content-Type"]).toBe("image/webp");
    const body = init?.body as ArrayBuffer;
    expect(body.byteLength).toBe(expected.bytes.byteLength);
    expect(Buffer.from(body).equals(expected.bytes)).toBe(true);
  });

  it("submits only the compressed avatar data URL, never the original file field", () => {
    const source = readFileSync(fileURLToPath(avatarEditorPath), "utf8");
    const fileInput = source.match(/<input[\s\S]*?type="file"[\s\S]*?\/>/)?.[0];

    expect(fileInput).toBeDefined();
    expect(fileInput).not.toMatch(/\bname=/);
    expect(source).not.toContain('name="avatar_file"');
    expect(source).toMatch(/type="hidden" name="avatar_data" value=\{preview\}/);
    expect(source).toContain("MAX_COMPRESSED_BYTES = 200 * 1024");
  });
});
