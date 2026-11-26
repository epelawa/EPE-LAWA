import type { MetadataRoute } from "next";

/**
 * Web app manifest so EPE LAWA is installable on phones. Icons reuse the
 * existing brand assets in `public/`; colours match the light theme seed.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EPE LAWA — The Voice of Epe Division",
    short_name: "EPE LAWA",
    description: "News, history, community discussion, business, tourism and radio for Epe Division, Lagos State.",
    start_url: "/",
    display: "standalone",
    background_color: "#F1F4FA",
    theme_color: "#F1F4FA",
    lang: "en",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
      { src: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
    ],
    // Long-press shortcuts on installed (PWA) home-screen icons.
    shortcuts: [
      { name: "Latest news", short_name: "News", url: "/news", icons: [{ src: "/icon.png", sizes: "192x192", type: "image/png" }] },
      { name: "Community forum", short_name: "Forum", url: "/forum", icons: [{ src: "/icon.png", sizes: "192x192", type: "image/png" }] },
      { name: "Listen to radio", short_name: "Radio", url: "/radio", icons: [{ src: "/icon.png", sizes: "192x192", type: "image/png" }] },
    ],
  };
}
