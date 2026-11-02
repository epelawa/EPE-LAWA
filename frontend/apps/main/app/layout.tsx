import type { Metadata } from "next";
import "./globals.css";
import Connectivity from "./connectivity";

const description = "EPE LAWA is preparing a home for news, broadcasting and community information for Epe Division and people connected to it around the world, at home and abroad.";

export const metadata: Metadata = {
  metadataBase: new URL("https://epelawa.vercel.app"),
  title: { default: "EPE LAWA — The Voice of Epe Division", template: "%s | EPE LAWA" },
  description,
  // Preview deployments must not be indexed; the owner explicitly approved indexing the public holding page.
  robots: process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production" ? { index: false, follow: false } : undefined,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "EPE LAWA",
    title: "EPE LAWA — The Voice of Epe Division",
    description,
    url: "/",
    images: [{ url: "/share.png", width: 1200, height: 630, alt: "EPE LAWA — The Voice of Epe Division" }],
  },
  twitter: { card: "summary_large_image", title: "EPE LAWA — The Voice of Epe Division", description, images: ["/share.png"] },
  icons: { icon: [{ url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" }, { url: "/icon.png", sizes: "192x192", type: "image/png" }], apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<Connectivity /></body></html>;
}
