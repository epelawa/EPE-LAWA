import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stop the default `x-powered-by: Next.js` fingerprint on every response.
  poweredByHeader: false,
  allowedDevOrigins: ["*.e2b.app"],
  transpilePackages: ["@epelawa/ui"],
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" },
      { key: "Pragma", value: "no-cache" },
      { key: "Expires", value: "0" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      // Report-only until the real application and its external providers have been tested.
      { key: "Content-Security-Policy-Report-Only", value: "default-src 'self'; base-uri 'self'; object-src 'none'; img-src 'self' data: https:; frame-ancestors 'none'" },
    ] }];
  },
};

export default nextConfig;
