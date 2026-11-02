import type { MetadataRoute } from "next";

/** Only public, indexable pages that actually exist. */
export default function sitemap(): MetadataRoute.Sitemap {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return [];
  return [{ url: "https://epelawa.vercel.app/" }, { url: "https://epelawa.vercel.app/about" }];
}
