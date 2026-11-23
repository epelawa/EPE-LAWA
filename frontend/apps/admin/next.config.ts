import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Admin app is mounted under /admin
  basePath: "/admin",
  // Stop the default `x-powered-by: Next.js` fingerprint on every response.
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_ADMIN_BASE_PATH: "/admin",
  },
  allowedDevOrigins: ["*.e2b.app"],
  transpilePackages: ["@epelawa/ui", "@epelawa/image-optimizer"],
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" },
      { key: "Pragma", value: "no-cache" },
      { key: "Expires", value: "0" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ] }];
  },
};

export default nextConfig;
