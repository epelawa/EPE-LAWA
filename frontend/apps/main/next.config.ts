import type { NextConfig } from "next";
import { siteUrl } from "./lib/site";

const nextConfig: NextConfig = {
  // Stop the default `x-powered-by: Next.js` fingerprint on every response.
  poweredByHeader: false,
  // @epelawa/ui ships TypeScript source so the apps compile one copy of it.
  transpilePackages: ["@epelawa/ui", "@epelawa/image-optimizer"],
  env: { NEXT_PUBLIC_ADMIN_BASE_PATH: "/admin" },
  allowedDevOrigins: ["*.e2b.app"],
  // The Next dev badge overlaps the fixed mini-player in end-to-end checks, blocking real input.
  ...(process.env.BROWSER_SMOKE_TEST === "true" ? { devIndicators: false } : {}),
  // Public forms send one browser-compressed photo (≤ ~700 KB as base64) with the
  // text fields. Next's 1 MB default leaves too little headroom, so allow 4 MB;
  // the server still rejects decoded images over 5 MB.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        // geolocation=(self): the map asks for location only after an explicit tap. It must be
        // allowed site-wide because the policy is fixed per document, so a visitor who reaches
        // /map through in-app navigation keeps the policy of the page they first loaded; a
        // deny-by-default value there made the browser reject the request without a prompt.
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        // Only the configured public origin; no wildcard and no credentials. Read from
        // NEXT_PUBLIC_SITE_URL so the Cloud Run domain is never hardcoded.
        { key: "Access-Control-Allow-Origin", value: siteUrl },
      ],
    }, {
      source: "/admin/:path*",
      headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" }],
    }];
  },
  // Legacy public URL from before the Ìtàn Ilú Mi rename. A permanent (308)
  // redirect keeps any query string and tells search engines to replace it.
  async redirects() {
    return [
      { source: "/community-history", destination: "/itan-ilu-mi", permanent: true },
      // Turn 5: the radio archive (and song requests) were withdrawn at the owner's request.
      // Old links land on the radio page instead of a 404.
      { source: "/radio/archive", destination: "/radio", permanent: true },
    ];
  },
};

export default nextConfig;
