import type { NextConfig } from "next";
import { siteUrl } from "./lib/site";

const nextConfig: NextConfig = {
  // Stop the default `x-powered-by: Next.js` fingerprint on every response.
  poweredByHeader: false,
  // @epelawa/ui ships TypeScript source so the apps compile one copy of it.
  transpilePackages: ["@epelawa/ui"],
  env: { NEXT_PUBLIC_ADMIN_BASE_PATH: "/admin" },
  allowedDevOrigins: ["*.e2b.app"],
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        // Report-only until real Next.js scripts, media, and embeds have been reviewed.
        { key: "Content-Security-Policy-Report-Only", value: "default-src 'self'; base-uri 'self'; object-src 'none'; img-src 'self' data: https:; frame-ancestors 'none'" },
        // Only the configured public origin; no wildcard and no credentials. Read from
        // NEXT_PUBLIC_SITE_URL so the Cloud Run domain is never hardcoded.
        { key: "Access-Control-Allow-Origin", value: siteUrl },
      ],
    }, {
      source: "/admin/:path*",
      headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" }],
    }, {
      source: "/map",
      // The map requests location only after an explicit user action. All other
      // routes keep the deny-by-default policy above; camera/microphone stay off.
      headers: [{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" }],
    }];
  },
  // Legacy public URL from before the Ìtàn Ilú Mi rename. A permanent (308)
  // redirect keeps any query string and tells search engines to replace it.
  async redirects() {
    return [{ source: "/community-history", destination: "/itan-ilu-mi", permanent: true }];
  },
};

export default nextConfig;
