import sharp from "sharp";

export const MAX_COMPRESSED_IMAGE_BYTES = 900 * 1024;
export const MAX_IMAGE_INPUT_BYTES = 26_214_400;

export type OptimizedImage = {
  bytes: Buffer;
  mimeType: "image/webp";
  extension: ".webp";
  width: number;
  height: number;
};

const ACCEPTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);
const DECODED_FORMATS = new Set(["jpeg", "png", "webp", "heif"]);
const ENCODE_STEPS = [
  { maxSide: 2048, quality: 78 },
  { maxSide: 2048, quality: 66 },
  { maxSide: 1600, quality: 62 },
  { maxSide: 1280, quality: 56 },
  { maxSide: 960, quality: 50 },
] as const;

/** Copy a byte view into a precisely-sized ArrayBuffer, excluding pooled Buffer slack. */
export function toExactArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const exact = new Uint8Array(bytes.byteLength);
  exact.set(bytes);
  return exact.buffer;
}

/**
 * Validate and re-encode a raster image for R2. Output is WebP, auto-oriented,
 * dimension-capped, stripped of source metadata, and at most 900 KiB. This is
 * server-side so every upload path receives the same storage guarantee even
 * when a browser bypasses optional client-side preview compression.
 */
export async function optimizeUploadedImage(
  input: ArrayBuffer | Uint8Array,
  sourceMime: string,
): Promise<OptimizedImage> {
  const mime = sourceMime.trim().toLowerCase();
  if (!ACCEPTED_MIME_TYPES.has(mime)) throw new Error("unsupported_image_type");

  const source = Buffer.from(input instanceof ArrayBuffer ? new Uint8Array(input) : input);
  if (source.byteLength < 64 || source.byteLength > MAX_IMAGE_INPUT_BYTES) {
    throw new Error("invalid_image_size");
  }

  const base = sharp(source, { failOn: "error", limitInputPixels: 50_000_000 });
  const metadata = await base.metadata();
  if (
    !metadata.width || !metadata.height ||
    metadata.width * metadata.height > 50_000_000 ||
    !metadata.format || !DECODED_FORMATS.has(metadata.format) ||
    (metadata.pages ?? 1) > 1
  ) {
    throw new Error("invalid_image_data");
  }

  for (const step of ENCODE_STEPS) {
    const { data, info } = await sharp(source, { failOn: "error", limitInputPixels: 50_000_000 })
      .rotate()
      .resize({
        width: step.maxSide,
        height: step.maxSide,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: step.quality, effort: 4, smartSubsample: true })
      .toBuffer({ resolveWithObject: true });

    if (data.byteLength <= MAX_COMPRESSED_IMAGE_BYTES) {
      return {
        bytes: data,
        mimeType: "image/webp",
        extension: ".webp",
        width: info.width,
        height: info.height,
      };
    }
  }

  throw new Error("image_cannot_be_compressed_below_limit");
}

export type MaximumCompression = {
  bytes: Buffer;
  mimeType: "image/webp";
  width: number;
  height: number;
};

/** Longest side kept by "Compress everything": wide enough for a full-width cover on a large phone or laptop. */
export const MAXIMUM_COMPRESSION_SIDE = 1600;
/** Logos, avatars and portraits are shown small, so they keep fewer pixels. */
export const MAXIMUM_COMPRESSION_SMALL_SIDE = 1024;
export const MAXIMUM_COMPRESSION_QUALITY = 55;

/**
 * Re-encode an already-stored raster image as small as it will go while it
 * still looks clean on the site: WebP at quality 55 with the slowest (best)
 * encoder effort, metadata stripped, longest side capped. Returns null for
 * anything that is not a single-frame JPEG/PNG/WebP/AVIF image, so callers
 * leave unknown files untouched.
 */
export async function compressImageToMaximum(
  input: ArrayBuffer | Uint8Array,
  options: { maxSide?: number; quality?: number } = {},
): Promise<MaximumCompression | null> {
  const source = Buffer.from(input instanceof ArrayBuffer ? new Uint8Array(input) : input);
  if (source.byteLength < 64 || source.byteLength > MAX_IMAGE_INPUT_BYTES) return null;
  const maxSide = Math.max(256, Math.min(4096, Math.round(options.maxSide ?? MAXIMUM_COMPRESSION_SIDE)));
  const quality = Math.max(30, Math.min(90, Math.round(options.quality ?? MAXIMUM_COMPRESSION_QUALITY)));
  try {
    const metadata = await sharp(source, { failOn: "error", limitInputPixels: 50_000_000 }).metadata();
    if (
      !metadata.width || !metadata.height ||
      !metadata.format || !DECODED_FORMATS.has(metadata.format) ||
      (metadata.pages ?? 1) > 1
    ) {
      return null;
    }
    const { data, info } = await sharp(source, { failOn: "error", limitInputPixels: 50_000_000 })
      .rotate()
      .resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true })
      .webp({ quality, effort: 6, smartSubsample: true })
      .toBuffer({ resolveWithObject: true });
    return { bytes: data, mimeType: "image/webp", width: info.width, height: info.height };
  } catch {
    return null;
  }
}
