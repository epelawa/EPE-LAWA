import type { MetadataRoute } from "next";
import { absoluteUrl, isIndexingAllowed } from "../lib/site";

/**
 * The hosting provider no longer decides this. `isIndexingAllowed()` reads the configured
 * public origin, so a preview deploy on any host can be excluded without touching this file.
 */
export default function robots(): MetadataRoute.Robots {
  if (!isIndexingAllowed()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return { rules: { userAgent: "*", allow: "/" }, sitemap: absoluteUrl("/sitemap.xml") };
}
