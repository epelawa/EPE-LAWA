import type { MetadataRoute } from "next";
import { absoluteUrl, isIndexingAllowed } from "../lib/site";

/**
 * Only public pages that actually render content. Members pages, the status reference
 * route and anything behind a session stay out.
 */
const publicPaths = [
  "/",
  "/news",
  "/itan-ilu-mi",
  "/forum",
  "/map",
  "/business-directory",
  "/tourism",
  "/radio",
  "/who-is-who",
  "/about",
  "/contact",
  "/guidelines",
  "/privacy",
  "/terms",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  if (!isIndexingAllowed()) return [];
  return publicPaths.map((pathname) => ({ url: absoluteUrl(pathname) }));
}
