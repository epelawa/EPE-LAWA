import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { cleanNewsTimes, latestNewsSlot, newsDue, nextNewsSlot, storiesOwed } from "../apps/main/lib/ai/news-schedule";
import { areaOf, cleanupCandidates, compressionSideFor, formatBytes, isImageObject, parseObjectPage, pieSlices, type StoredObject } from "../apps/admin/lib/storage-plan";
import { compressImageToMaximum } from "../packages/image-optimizer/src/optimize";

const at = (iso: string) => Date.parse(iso);

describe("news schedule the AI follows", () => {
  it("keeps only valid HH:MM times, sorted and without duplicates", () => {
    expect(cleanNewsTimes(["18:00", "07:30", "07:30", "24:00", "7:00", "", 5, "12:05:00"])).toEqual(["07:30", "12:05", "18:00"]);
  });

  it("finds the last set time in Lagos time (UTC+1)", () => {
    // 08:10 UTC is 09:10 in Lagos: the 07:00 Lagos slot (06:00 UTC) has passed, 12:00 has not.
    expect(new Date(latestNewsSlot(["07:00", "12:00"], at("2026-11-27T08:10:00Z"))!).toISOString()).toBe("2026-11-27T06:00:00.000Z");
    // 05:30 UTC is 06:30 Lagos: before today's first slot, so yesterday's last one counts.
    expect(new Date(latestNewsSlot(["07:00", "22:00"], at("2026-11-27T05:30:00Z"))!).toISOString()).toBe("2026-11-26T21:00:00.000Z");
    expect(new Date(nextNewsSlot(["07:00", "22:00"], at("2026-11-27T05:30:00Z"))!).toISOString()).toBe("2026-11-27T06:00:00.000Z");
  });

  it("runs once per set time and catches up a missed one once", () => {
    const base = { news_interval_minutes: 60, news_times: ["07:00", "12:00"], news_owed: 0 };
    const now = at("2026-11-27T06:03:00Z"); // 07:03 Lagos
    expect(newsDue({ ...base, last_news_run_at: "2026-11-26T11:00:00Z" }, now)).toEqual({ due: true, reason: "schedule", target: "per_run" });
    expect(newsDue({ ...base, last_news_run_at: "2026-11-27T06:00:30Z" }, now)).toEqual({ due: false });
    // Set times win over the interval: 3 hours since the last run is not enough on its own.
    expect(newsDue({ ...base, last_news_run_at: "2026-11-27T06:01:00Z" }, at("2026-11-27T09:30:00Z"))).toEqual({ due: false });
  });

  it("uses any custom interval when no times are set", () => {
    const settings = { news_interval_minutes: 25, news_times: [], news_owed: 0, last_news_run_at: "2026-11-27T10:00:00Z" };
    expect(newsDue(settings, at("2026-11-27T10:20:00Z")).due).toBe(false);
    expect(newsDue(settings, at("2026-11-27T10:23:00Z")).due).toBe(true);
    expect(newsDue({ ...settings, last_news_run_at: null }, at("2026-11-27T10:00:00Z")).due).toBe(true);
  });

  it("writes stories still owed at the next pass until the chosen number is met", () => {
    const settings = { news_interval_minutes: 60, news_times: [], news_owed: 4, last_news_run_at: "2026-11-27T10:00:00Z" };
    expect(newsDue(settings, at("2026-11-27T10:05:00Z"))).toEqual({ due: true, reason: "owed", target: "owed" });
    expect(storiesOwed(6, 2, true)).toBe(4);
    expect(storiesOwed(6, 2, false)).toBe(0); // ran out of fresh stories or budget: nothing is owed
    expect(storiesOwed(3, 3, true)).toBe(0);
  });
});

const object = (key: string, size: number, uploaded: string | null = "2026-11-01T00:00:00Z"): StoredObject => ({ key, size, uploaded, contentType: null });

describe("storage cleanup keeps everything the site uses", () => {
  const now = at("2026-11-27T12:00:00Z");
  const objects = [
    object("media/covers/2026-11/used.webp", 100),
    object("media/covers/2026-11/orphan.webp", 200),
    object("media/business/2026/new-upload.webp", 50, "2026-11-27T09:00:00Z"),
    object("media/site/2026/unknown-age.webp", 70, null),
    object("db-backups/20261127/epelawa.sql.gz", 9000),
    object("other/thing.bin", 10),
    object("media/covers/2026-11/odd name (1).webp", 10),
  ];

  it("deletes only old, unreferenced site uploads — never backups, recent uploads or files of unknown age", () => {
    const keep = new Set(["media/covers/2026-11/used.webp"]);
    expect(cleanupCandidates(objects, keep, now).map((entry) => entry.key)).toEqual(["media/covers/2026-11/orphan.webp"]);
  });

  it("groups files by site area for the chart", () => {
    expect(areaOf("media/covers/2026-11/a.webp")).toBe("covers");
    expect(areaOf("media/avatars/a.webp")).toBe("avatars");
    expect(areaOf("db-backups/x.sql.gz")).toBe("backups");
    expect(areaOf("media/whatever/a.webp")).toBe("other");
    expect(compressionSideFor("media/business/2026/logo.webp", 1600, 1024)).toBe(1024);
    expect(compressionSideFor("media/covers/2026-11/c.webp", 1600, 1024)).toBe(1600);
    expect(isImageObject({ key: "media/covers/a.jpg", contentType: null })).toBe(true);
    expect(isImageObject({ key: "db-backups/a.sql.gz", contentType: "application/gzip" })).toBe(false);
  });

  it("reads Cloudflare list pages defensively", () => {
    expect(parseObjectPage({ success: false, result: [] }).state).toBe("unavailable");
    expect(parseObjectPage({ success: true, result: [], result_info: { is_truncated: true } }).state).toBe("unavailable");
    const page = parseObjectPage({ success: true, result: [{ key: "media/covers/a.webp", size: 12, last_modified: "2026-11-01T00:00:00Z", http_metadata: { contentType: "image/webp" } }, { size: 3 }], result_info: { is_truncated: false } });
    expect(page).toEqual({ state: "ready", cursor: null, isTruncated: false, objects: [{ key: "media/covers/a.webp", size: 12, uploaded: "2026-11-01T00:00:00Z", contentType: "image/webp" }] });
  });

  it("draws a donut whose slices add up to the whole", () => {
    const slices = pieSlices([{ label: "DB", bytes: 300, color: "#000" }, { label: "R2", bytes: 100, color: "#fff" }, { label: "Empty", bytes: 0, color: "#f00" }]);
    expect(slices.map((slice) => slice.share)).toEqual([0.75, 0.25]);
    expect(slices[0].path.startsWith("M 100.000 10.000 A 90 90 0 1 1")).toBe(true);
    expect(pieSlices([{ label: "Only", bytes: 5, color: "#000" }])).toHaveLength(1);
    expect(formatBytes(22_730_419)).toBe("21.7 MB");
    expect(formatBytes(0)).toBe("0 B");
  });
});

describe("maximum compression", () => {
  it("shrinks a large photo to WebP within the side limit and ignores non-images", async () => {
    const noise = Buffer.alloc(2400 * 1600 * 3);
    for (let index = 0; index < noise.length; index += 1) noise[index] = (index * 2654435761) % 251;
    const jpeg = await sharp(noise, { raw: { width: 2400, height: 1600, channels: 3 } }).jpeg({ quality: 95 }).toBuffer();
    const result = await compressImageToMaximum(jpeg, { maxSide: 1600 });
    expect(result).not.toBeNull();
    expect(result!.mimeType).toBe("image/webp");
    expect(Math.max(result!.width, result!.height)).toBe(1600);
    expect(result!.bytes.byteLength).toBeLessThan(jpeg.byteLength);
    expect(await compressImageToMaximum(Buffer.from("not an image at all, just some text that is long enough to pass the size check"))).toBeNull();
  }, 30_000);
});
