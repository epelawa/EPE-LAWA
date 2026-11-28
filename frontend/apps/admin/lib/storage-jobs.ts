import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { compressImageToMaximum, MAXIMUM_COMPRESSION_SIDE, MAXIMUM_COMPRESSION_SMALL_SIDE } from "@epelawa/image-optimizer/optimize";
import { cleanupCandidates, compressionSideFor, formatBytes, isImageObject, MEDIA_PREFIX, type StoredObject } from "./storage-plan";
import { listBucket, readObject, removeObject, replaceObject, type BucketName } from "./storage-r2";

/**
 * The two Storage desk jobs. Both run in the background after the admin
 * presses the button, write live progress to `storage_jobs`, and stop safely
 * before Vercel's 300-second limit; pressing the button again continues.
 *
 * Cleanup deletes only site uploads (media/…) that nothing on the site
 * mentions — every article version and body, business, person, event,
 * history record, tourism entry, site page, profile and the media library
 * are checked by the database — and never files from the last 24 hours or
 * the database backups. If the check cannot run, nothing is deleted.
 *
 * Compression re-encodes each image as small WebP and writes it back under
 * the same key, so no link anywhere changes.
 */

export const STORAGE_JOB_SECONDS = 240;
const KEYS_PER_CHECK = 1000;

type JobKind = "cleanup" | "compress";
type Stats = Record<string, number | string | string[] | boolean>;

async function progress(db: SupabaseClient, id: string, text: string, stats?: Stats) {
  await db.from("storage_jobs").update({ progress: text.slice(0, 300), updated_at: new Date().toISOString(), ...(stats ? { stats } : {}) }).eq("id", id);
}

async function finish(db: SupabaseClient, id: string, status: "success" | "partial" | "failed", text: string, stats: Stats) {
  await db.from("storage_jobs").update({ status, progress: text.slice(0, 300), stats, updated_at: new Date().toISOString(), finished_at: new Date().toISOString() }).eq("id", id);
}

/** Starts a job row, refusing while another job is still running. */
export async function openStorageJob(db: SupabaseClient, kind: JobKind, scope: string, userId: string | null): Promise<{ id: string } | { busy: true } | { error: true }> {
  const now = Date.now();
  await db.from("storage_jobs").update({ status: "failed", finished_at: new Date().toISOString(), progress: "Stopped before finishing (time limit)." }).eq("status", "running").lt("started_at", new Date(now - 10 * 60_000).toISOString());
  const { count } = await db.from("storage_jobs").select("id", { count: "exact", head: true }).eq("status", "running");
  if ((count ?? 0) > 0) return { busy: true };
  const { data, error } = await db.from("storage_jobs").insert({ kind, scope, started_by: userId, progress: "Starting…" }).select("id").single();
  if (error || !data) return { error: true };
  return { id: String(data.id) };
}

async function inventory(db: SupabaseClient, id: string, buckets: BucketName[]): Promise<Map<BucketName, StoredObject[]> | string> {
  const result = new Map<BucketName, StoredObject[]>();
  for (const bucket of buckets) {
    await progress(db, id, `Listing the ${bucket} bucket…`);
    const listed = await listBucket(bucket, MEDIA_PREFIX);
    if (listed.state === "unconfigured") return `File storage is not configured in the hosting environment (missing ${listed.missing.join(", ")}).`;
    if (listed.state !== "ready") return `The ${bucket} bucket could not be listed from the file storage service.`;
    result.set(bucket, listed.objects);
  }
  return result;
}

async function keysInUse(db: SupabaseClient, keys: string[]): Promise<Set<string> | null> {
  const used = new Set<string>();
  for (let index = 0; index < keys.length; index += KEYS_PER_CHECK) {
    const { data, error } = await db.rpc("storage_keys_in_use", { p_keys: keys.slice(index, index + KEYS_PER_CHECK) });
    if (error || !Array.isArray(data)) return null;
    for (const key of data) if (typeof key === "string") used.add(key);
  }
  return used;
}

async function inBatches<T>(items: T[], size: number, deadline: number, work: (item: T) => Promise<void>): Promise<number> {
  let done = 0;
  for (let index = 0; index < items.length; index += size) {
    if (Date.now() > deadline) break;
    const batch = items.slice(index, index + size);
    await Promise.all(batch.map(work));
    done += batch.length;
  }
  return done;
}

export async function runStorageCleanup(db: SupabaseClient, id: string, options: { buckets: BucketName[]; dryRun: boolean }): Promise<void> {
  const deadline = Date.now() + (STORAGE_JOB_SECONDS - 20) * 1000;
  try {
    const listed = await inventory(db, id, options.buckets);
    if (typeof listed === "string") return await finish(db, id, "failed", listed, {});
    const all = [...listed.values()].flat();
    await progress(db, id, `Checking ${all.length} files against every article, page, listing and profile…`);
    const used = await keysInUse(db, [...new Set(all.map((object) => object.key))]);
    if (!used) return await finish(db, id, "failed", "The site-wide reference check failed, so nothing was deleted.", { scanned: all.length });

    const plan: { bucket: BucketName; object: StoredObject }[] = [];
    for (const [bucket, objects] of listed) for (const object of cleanupCandidates(objects, used)) plan.push({ bucket, object });
    const planBytes = plan.reduce((sum, entry) => sum + entry.object.size, 0);
    const base: Stats = { scanned: all.length, in_use: all.filter((object) => used.has(object.key)).length, unused: plan.length, unused_bytes: planBytes, dry_run: options.dryRun, sample: plan.slice(0, 12).map((entry) => entry.object.key) };
    if (options.dryRun) {
      return await finish(db, id, "success", `${plan.length} unused file${plan.length === 1 ? "" : "s"} (${formatBytes(planBytes)}) could be removed. ${base.in_use} file${base.in_use === 1 ? " is" : "s are"} in use and will stay.`, base);
    }

    let deleted = 0;
    let freed = 0;
    let failed = 0;
    const removedKeys: string[] = [];
    const attempted = await inBatches(plan, 8, deadline, async ({ bucket, object }) => {
      if (await removeObject(bucket, object.key)) {
        deleted += 1;
        freed += object.size;
        removedKeys.push(object.key);
      } else failed += 1;
    });
    for (let index = 0; index < removedKeys.length; index += 200) {
      await db.from("storage_compressed").delete().in("object_key", removedKeys.slice(index, index + 200));
    }
    const remaining = plan.length - attempted;
    const stats: Stats = { ...base, deleted, freed_bytes: freed, failed, remaining };
    const text = `Removed ${deleted} unused file${deleted === 1 ? "" : "s"}, freeing ${formatBytes(freed)}. ${base.in_use} file${base.in_use === 1 ? "" : "s"} still used by the site were kept.${failed ? ` ${failed} could not be removed.` : ""}${remaining ? ` ${remaining} left — press the button again to continue.` : ""}`;
    return await finish(db, id, failed || remaining ? "partial" : "success", text, stats);
  } catch (error) {
    return await finish(db, id, "failed", `Stopped unexpectedly: ${error instanceof Error ? error.message : "unknown error"}`, {});
  }
}

export async function runStorageCompression(db: SupabaseClient, id: string, options: { buckets: BucketName[] }): Promise<void> {
  const deadline = Date.now() + (STORAGE_JOB_SECONDS - 25) * 1000;
  try {
    const listed = await inventory(db, id, options.buckets);
    if (typeof listed === "string") return await finish(db, id, "failed", listed, {});
    const { data: doneRows } = await db.from("storage_compressed").select("bucket,object_key,bytes_after").limit(50_000);
    const done = new Map((doneRows ?? []).map((row) => [`${row.bucket}:${row.object_key}`, Number(row.bytes_after)]));

    const queue: { bucket: BucketName; object: StoredObject }[] = [];
    let skipped = 0;
    for (const [bucket, objects] of listed) {
      for (const object of objects) {
        if (!isImageObject(object)) continue;
        // Already squeezed and unchanged since: nothing more to gain.
        if (done.get(`${bucket}:${object.key}`) === object.size) { skipped += 1; continue; }
        queue.push({ bucket, object });
      }
    }
    queue.sort((a, b) => b.object.size - a.object.size);
    let shrunk = 0;
    let alreadySmall = 0;
    let failed = 0;
    let before = 0;
    let after = 0;
    let handled = 0;
    const attempted = await inBatches(queue, 3, deadline, async ({ bucket, object }) => {
      const bytes = await readObject(bucket, object.key);
      const result = bytes ? await compressImageToMaximum(bytes, { maxSide: compressionSideFor(object.key, MAXIMUM_COMPRESSION_SIDE, MAXIMUM_COMPRESSION_SMALL_SIDE) }) : null;
      handled += 1;
      if (!bytes || !result) { failed += 1; return; }
      const original = bytes.byteLength;
      if (result.bytes.byteLength >= original * 0.95) {
        alreadySmall += 1;
        await db.from("storage_compressed").upsert({ bucket, object_key: object.key, bytes_before: original, bytes_after: original, compressed_at: new Date().toISOString() });
        return;
      }
      if (!(await replaceObject(bucket, object.key, result.bytes, result.mimeType))) { failed += 1; return; }
      shrunk += 1;
      before += original;
      after += result.bytes.byteLength;
      await Promise.all([
        db.from("storage_compressed").upsert({ bucket, object_key: object.key, bytes_before: original, bytes_after: result.bytes.byteLength, compressed_at: new Date().toISOString() }),
        db.from("media_assets").update({ byte_size: result.bytes.byteLength, mime_type: result.mimeType, width: result.width, height: result.height }).eq("object_key", object.key),
      ]);
      if (handled % 9 === 0) await progress(db, id, `Compressed ${handled} of ${queue.length} images — ${formatBytes(before - after)} saved so far…`);
    });
    const remaining = queue.length - attempted;
    const stats: Stats = { images: queue.length + skipped, shrunk, already_small: alreadySmall + skipped, failed, remaining, bytes_before: before, bytes_after: after, saved_bytes: before - after };
    const text = queue.length === 0
      ? `All ${skipped} image${skipped === 1 ? " is" : "s are"} already at maximum compression.`
      : `Compressed ${shrunk} image${shrunk === 1 ? "" : "s"} and saved ${formatBytes(before - after)}${before ? ` (${Math.round(((before - after) / before) * 100)}% smaller)` : ""}. ${alreadySmall + skipped} were already as small as they go.${failed ? ` ${failed} could not be read or re-encoded and were left as they are.` : ""}${remaining ? ` ${remaining} left — press the button again to continue.` : ""}`;
    return await finish(db, id, failed || remaining ? "partial" : "success", text, stats);
  } catch (error) {
    return await finish(db, id, "failed", `Stopped unexpectedly: ${error instanceof Error ? error.message : "unknown error"}`, {});
  }
}
