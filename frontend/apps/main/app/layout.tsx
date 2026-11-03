import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
// Shared token layer. Every app imports it exactly once, here or in its own root layout.
import "@epelawa/ui/tokens.css";
import "@epelawa/ui/ui.css";
import "./globals.css";
import Connectivity from "./connectivity";
import SiteHeader from "../components/site-header";
import SiteFooter from "../components/site-footer";
import { mainNavigation } from "../lib/navigation";
import { isIndexingAllowed, newsUrl, siteUrl } from "../lib/site";
import { themeScript } from "../lib/theme";

// next/font downloads and self-hosts these files at build time, so a reader on a metered
// connection never talks to a third-party font host.
const displayFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
  variable: "--font-display-face",
});

const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  variable: "--font-body-face",
});

const description =
  "EPE LAWA is the official publication for Epe Division — independent journalism, public knowledge and the people shaping the place.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "EPE LAWA — The official Epe Lawa website", template: "%s | EPE LAWA" },
  description,
  other: { "clyvro-verification": "clyvro-verification=bgGvrkMEUkTOaufJIGTtWi-l7mQSZ4dmh-QpuoM4_WM" },
  // Indexing is decided in lib/site.ts, not by a hosting provider's environment variable.
  robots: isIndexingAllowed() ? undefined : { index: false, follow: false },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "EPE LAWA",
    title: "EPE LAWA — The official Epe Lawa website",
    description,
    url: "/",
    images: [{ url: "/share.png", width: 1200, height: 630, alt: "EPE LAWA — The official Epe Lawa website" }],
  },
  twitter: { card: "summary_large_image", title: "EPE LAWA — The official Epe Lawa website", description, images: ["/share.png"] },
  icons: { icon: [{ url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" }, { url: "/icon.png", sizes: "192x192", type: "image/png" }], apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }] },
};

const navigation = mainNavigation(newsUrl);

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body>
        {/* Theme applied before first paint: no flash of the wrong theme. */}
        <Script strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader items={navigation} />
        <main id="main" className="site-main" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
        <Connectivity />
      </body>
    </html>
  );
}
