import type { MetadataRoute } from "next";
import { absoluteUrl, isIndexingAllowed } from "../lib/site";

/**
 * Preview deploys stay excluded; production allows public pages but never the
 * private staff workspace. The sitemap still contains only explicit public routes.
 */
export default function robots(): MetadataRoute.Robots {
  if (!isIndexingAllowed()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
