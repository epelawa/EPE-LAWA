/**
 * Pure rules for AI story covers (unit-tested): spotting outlet logos and
 * default share cards, reading picture sizes, and keeping image searches and
 * generation prompts free of names, brands and text.
 */

const LOGO_WORDS = /(^|[\/_.\-])(logo|logos|favicon|apple-touch|icon|icons|sprite|brand|branding|masthead|placeholder|default|fallback|no[-_]?image|noimage|blank|avatar|gravatar|og[-_]?default|default[-_]?og|share[-_]?default|social[-_]?(?:card|share|default)|site[-_]?(?:image|share)|watermark)([\/_.\-]|\d|$)/i;

/** URL patterns that are an outlet's logo, icon or default share card rather than a news photo. */
export function looksLikeLogoUrl(url: string): boolean {
  let path: string;
  try {
    const parsed = new URL(url);
    path = decodeURIComponent(parsed.pathname).toLowerCase();
  } catch {
    return true;
  }
  if (/\.(svg|ico)(\?|$)/.test(path)) return true;
  if (LOGO_WORDS.test(path)) return true;
  // WordPress thumbnails such as -150x150 or -300x100 are far too small for a cover.
  const sized = path.match(/-(\d{2,4})x(\d{2,4})\.(?:jpe?g|png|webp|gif)$/);
  if (sized && (Number(sized[1]) < 480 || Number(sized[2]) < 250)) return true;
  return false;
}

/** Same picture, ignoring query strings, size suffixes and protocol differences. */
export function sameImage(a: string, b: string): boolean {
  const key = (value: string) => {
    try {
      const url = new URL(value);
      return `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/-\d{2,4}x\d{2,4}(?=\.[a-z]+$)/i, "")}`.toLowerCase();
    } catch {
      return value.toLowerCase();
    }
  };
  return key(a) === key(b);
}

export type ImageSize = { width: number; height: number };

/** Width and height from the first bytes of a JPEG, PNG, WebP or GIF. */
export function imageSize(bytes: Uint8Array): ImageSize | null {
  const b = bytes;
  if (b.length < 24) return null;
  // PNG
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    const width = (b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19];
    const height = (b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23];
    return width > 0 && height > 0 ? { width, height } : null;
  }
  // GIF
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return { width: b[6] | (b[7] << 8), height: b[8] | (b[9] << 8) };
  // WebP
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) {
    const chunk = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (chunk === "VP8X" && b.length >= 30) return { width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
    if (chunk === "VP8 " && b.length >= 30) return { width: (b[26] | (b[27] << 8)) & 0x3fff, height: (b[28] | (b[29] << 8)) & 0x3fff };
    if (chunk === "VP8L" && b.length >= 25) {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    return null;
  }
  // JPEG: walk the segments to the first start-of-frame marker.
  if (b[0] === 0xff && b[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < b.length) {
      if (b[offset] !== 0xff) { offset += 1; continue; }
      const marker = b[offset + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { offset += 2; continue; }
      const length = (b[offset + 2] << 8) | b[offset + 3];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: (b[offset + 5] << 8) | b[offset + 6], width: (b[offset + 7] << 8) | b[offset + 8] };
      }
      if (length < 2) return null;
      offset += 2 + length;
    }
  }
  return null;
}

/** Too small, a thin banner, or a small square: logos and icons, not news photos. */
export function logoShaped(size: ImageSize): boolean {
  const ratio = size.width / size.height;
  if (size.width < 480 || size.height < 250) return true;
  if (ratio > 3 || ratio < 0.5) return true;
  if (Math.abs(ratio - 1) < 0.02 && size.width <= 700) return true;
  return false;
}

/** 2–6 plain words for a photo search, no quotes or operators. */
export function sanitiseImageQuery(value: string): string {
  return value.replace(/[^\p{L}\p{N} '-]+/gu, " ").replace(/\s+/g, " ").trim().split(" ").slice(0, 6).join(" ").slice(0, 80);
}

/**
 * A generation prompt that never asks for logos, text or real, identifiable
 * people — readers must not mistake an illustration for a news photo.
 */
export function sanitiseImagePrompt(value: string): string {
  const subject = value.replace(/[^\p{L}\p{N} ,.'-]+/gu, " ").replace(/\s+/g, " ").trim().slice(0, 220);
  if (subject.length < 6) return "";
  return `Editorial news illustration, photorealistic, natural light: ${subject}. No text, no words, no logos, no watermarks, no recognisable real people`;
}
