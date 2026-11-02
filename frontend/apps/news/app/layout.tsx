import type { Metadata } from "next";
import "./globals.css";

const description = "The EPE LAWA news publication is being prepared. Articles are not connected yet; follow the project as its editorial services are built.";
export const metadata: Metadata = {
  title: "EPE LAWA News",
  description,
  robots: { index: false, follow: false },
  openGraph: { title: "EPE LAWA News", description, type: "website", images: [{ url: "https://epelawa.vercel.app/share.png", width: 1200, height: 630, alt: "EPE LAWA logo" }] },
  twitter: { card: "summary_large_image", title: "EPE LAWA News", description, images: ["https://epelawa.vercel.app/share.png"] },
  icons: { icon: [{ url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" }, { url: "/icon.png", sizes: "192x192", type: "image/png" }], apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
