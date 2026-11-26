/**
 * Browser-side image preparation shared by every upload field. Phone photos are
 * often 4–12 MB (and sometimes HEIC on iOS, which Safari converts on pick), so we
 * accept any image the browser can decode up to 25 MB and re-encode it as a
 * JPEG data URL small enough for a server action. The server re-validates and
 * converts to WebP before anything is stored.
 */
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

async function decode(file: File): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
      return { width: bitmap.width, height: bitmap.height, draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h), close: () => bitmap.close() };
    } catch {
      // Fall through to <img>, which decodes some formats createImageBitmap rejects.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return { width: img.naturalWidth, height: img.naturalHeight, draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h), close: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

/** Resize to fit `maxSide` and encode as JPEG, stepping quality down to stay under `maxBytes`. */
export async function prepareImage(file: File, maxSide: number, maxBytes = 700 * 1024): Promise<string> {
  if (file.type && !file.type.startsWith("image/")) throw new Error("not_image");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("too_large");
  const source = await decode(file);
  try {
    if (!source.width || !source.height) throw new Error("invalid");
    let side = maxSide;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const scale = Math.min(1, side / Math.max(source.width, source.height));
      const width = Math.max(1, Math.round(source.width * scale));
      const height = Math.max(1, Math.round(source.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("canvas");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      source.draw(context, width, height);
      const quality = [0.82, 0.74, 0.68, 0.62, 0.56][attempt];
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      // base64 is ~4/3 of the binary size
      if (dataUrl.length * 0.75 <= maxBytes || attempt === 4) return dataUrl;
      side = Math.round(side * 0.82);
    }
    throw new Error("encode");
  } finally {
    source.close();
  }
}

export function imageErrorMessage(error: unknown, noun = "image"): string {
  const code = error instanceof Error ? error.message : "";
  if (code === "too_large") return `That ${noun} is larger than 25 MB. Choose a smaller photo.`;
  if (code === "not_image") return `That file is not an image. Choose a JPEG, PNG, WebP or phone photo.`;
  return `This ${noun} could not be read on this device. Try a JPEG or PNG version.`;
}
