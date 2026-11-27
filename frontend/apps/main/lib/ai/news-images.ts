import "server-only";
import { createHash } from "node:crypto";
import { fetchPublicBytes, fetchPublicText } from "./safe-fetch";
import { extractArticle, type Outlet } from "./news-sources";
import { normalizeExternalNewsCoverUrl } from "../news-cover-url.mjs";
import { imageSize, looksLikeLogoUrl, logoShaped, sameImage, sanitiseImagePrompt, sanitiseImageQuery } from "./news-image-rules";

/**
 * Picks the cover for an AI story, in this order:
 *  1. the report's own photo, but never the outlet's logo or default share card;
 *  2. a freely licensed photo found on Wikimedia Commons for the story's subject;
 *  3. an AI-generated editorial illustration (an image link, nothing uploaded);
 *  4. nothing — the site then shows its own fallback image.
 * Every option is an image link (hotlinked), checked to be a real, large picture.
 */

export type CoverChoice = {
  url: string;
  alt: string;
  credit: string;
  sourceUrl: string;
  licenseUrl: string;
  caption: string | null;
  kind: "source" | "commons" | "generated";
};

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp;q=0.9,image/gif;q=0.5";

/** The outlet's own default share image (usually its logo), read once per run. */
const homepageImages = new Map<string, Promise<string | null>>();

export function outletDefaultImage(outlet: Outlet): Promise<string | null> {
  const cached = homepageImages.get(outlet.id);
  if (cached) return cached;
  const domain = outlet.domains[0];
  const loading = fetchPublicText(`https://${domain.startsWith("www.") ? domain : `www.${domain}`}/`, { timeoutMs: 6000, maxBytes: 600_000 })
    .then((page) => (page && page.status < 400 ? extractArticle(page.text).image : null))
    .catch(() => null);
  homepageImages.set(outlet.id, loading);
  return loading;
}

/** True when the URL is a real, large, non-logo picture. */
async function usablePicture(url: string, avoid: (string | null)[]): Promise<boolean> {
  if (looksLikeLogoUrl(url) || avoid.some((other) => other && sameImage(other, url))) return false;
  const fetched = await fetchPublicBytes(url, { timeoutMs: 9000, maxBytes: 262_144, accept: IMAGE_ACCEPT });
  if (!fetched || fetched.status >= 400) return false;
  const size = imageSize(fetched.bytes);
  if (!size) return false;
  return !logoShaped(size);
}

async function sourcePhoto(candidates: (string | null | undefined)[], outlets: Outlet[]): Promise<string | null> {
  const logos = await Promise.all(outlets.map((outlet) => outletDefaultImage(outlet)));
  const tried = new Set<string>();
  for (const raw of candidates) {
    const url = normalizeExternalNewsCoverUrl(raw ?? "");
    if (!url || tried.has(url)) continue;
    tried.add(url);
    if (await usablePicture(url, logos)) return url;
  }
  return null;
}

type CommonsPage = { title?: string; imageinfo?: { thumburl?: string; url?: string; descriptionurl?: string; width?: number; height?: number; mime?: string; extmetadata?: Record<string, { value?: string }> }[] };

function plain(value: string | undefined): string {
  return (value ?? "").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
}

/** A freely licensed photo of the subject from Wikimedia Commons (no key needed). */
async function commonsPhoto(query: string): Promise<CoverChoice | null> {
  const search = sanitiseImageQuery(query);
  if (!search) return null;
  const api = new URL("https://commons.wikimedia.org/w/api.php");
  api.search = new URLSearchParams({
    action: "query", format: "json", generator: "search", gsrsearch: `${search} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "10",
    prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: "1280", origin: "*",
  }).toString();
  const page = await fetchPublicText(api.toString(), { timeoutMs: 8000, maxBytes: 800_000, accept: "application/json" });
  if (!page || page.status >= 400) return null;
  let pages: CommonsPage[] = [];
  try {
    pages = Object.values((JSON.parse(page.text) as { query?: { pages?: Record<string, CommonsPage> } }).query?.pages ?? {});
  } catch {
    return null;
  }
  for (const entry of pages) {
    const info = entry.imageinfo?.[0];
    if (!info || !/^image\/(jpeg|png|webp)$/.test(info.mime ?? "") || (info.width ?? 0) < 800 || (info.height ?? 0) < 450) continue;
    const meta = info.extmetadata ?? {};
    const license = plain(meta.LicenseShortName?.value);
    if (!license || /non-?free|fair use/i.test(license)) continue;
    if (/logo|icon|flag|coat of arms|seal|emblem|map|diagram|chart/i.test(entry.title ?? "")) continue;
    const url = normalizeExternalNewsCoverUrl(info.thumburl ?? info.url ?? "");
    const sourceUrl = normalizeExternalNewsCoverUrl(info.descriptionurl ?? "");
    if (!url || !sourceUrl) continue;
    const artist = plain(meta.Artist?.value).slice(0, 120);
    const licenseUrl = normalizeExternalNewsCoverUrl(plain(meta.LicenseUrl?.value)) ?? sourceUrl;
    return {
      url,
      alt: plain(meta.ImageDescription?.value).slice(0, 200) || (entry.title ?? "").replace(/^File:/, "").replace(/\.[a-z]+$/i, ""),
      credit: `${artist ? `${artist} / ` : ""}Wikimedia Commons (${license})`.slice(0, 300),
      sourceUrl,
      licenseUrl,
      caption: "Illustrative photo",
      kind: "commons",
    };
  }
  return null;
}

export function generatedImageUrl(prompt: string, seedText: string): string | null {
  const clean = sanitiseImagePrompt(prompt);
  if (!clean) return null;
  const seed = parseInt(createHash("sha256").update(seedText).digest("hex").slice(0, 8), 16) % 1_000_000;
  const base = (process.env.AI_IMAGE_GENERATOR_URL || "https://image.pollinations.ai/prompt/").replace(/\/?$/, "/");
  return normalizeExternalNewsCoverUrl(`${base}${encodeURIComponent(clean)}?width=1280&height=720&nologo=true&safe=true&seed=${seed}`);
}

/** An AI-generated editorial illustration, used as an image link. */
async function generatedPicture(prompt: string, seedText: string): Promise<CoverChoice | null> {
  if (process.env.AI_IMAGE_GENERATION === "off") return null;
  const url = generatedImageUrl(prompt, seedText);
  if (!url) return null;
  // Generating takes a while; the first request also warms the generator's cache for readers.
  const fetched = await fetchPublicBytes(url, { timeoutMs: 45_000, maxBytes: 262_144, accept: IMAGE_ACCEPT });
  if (!fetched || fetched.status >= 400 || !imageSize(fetched.bytes)) return null;
  return { url, alt: sanitiseImagePrompt(prompt).slice(0, 200), credit: "AI-generated illustration (EPE LAWA)", sourceUrl: url, licenseUrl: url, caption: "Illustration", kind: "generated" };
}

export async function chooseCover(options: {
  candidates: (string | null | undefined)[];
  /** The outlet(s) the photos came from: their default share images (logos) are never used. */
  outlet: Outlet | Outlet[] | null;
  alt: string;
  imageQuery: string;
  imagePrompt: string;
  seed: string;
  step?: (message: string) => Promise<void>;
}): Promise<CoverChoice | null> {
  const outlets = options.outlet ? (Array.isArray(options.outlet) ? options.outlet : [options.outlet]) : [];
  const own = await sourcePhoto(options.candidates, outlets).catch(() => null);
  if (own) return { url: own, alt: options.alt, credit: "File photo", sourceUrl: own, licenseUrl: own, caption: null, kind: "source" };
  await options.step?.("The report had no usable photo (missing or only the outlet's logo) — searching for a similar freely licensed photo…");
  const commons = await commonsPhoto(options.imageQuery).catch(() => null);
  if (commons) return commons;
  await options.step?.("No similar photo found — generating an illustration…");
  const generated = await generatedPicture(options.imagePrompt || options.imageQuery, options.seed).catch(() => null);
  if (generated) return generated;
  await options.step?.("No picture could be found or generated — the story will use the site's fallback image.");
  return null;
}
