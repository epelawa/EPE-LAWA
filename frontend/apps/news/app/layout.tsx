import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import "@epelawa/ui/tokens.css";
import "@epelawa/ui/ui.css";
import "./globals.css";
import Connectivity from "../components/connectivity";
import SiteHeader from "../components/site-header";
import SiteFooter from "../components/site-footer";
import { mainNavigation } from "../lib/navigation";
import { isIndexingAllowed, siteUrl } from "../lib/site";
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
  "EPE LAWA News — reporting from Epe Division, Lagos State, at home and abroad. Articles are not connected yet; follow the project as its editorial services are built.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "EPE LAWA News — Reporting from Epe Division",
    template: "%s | EPE LAWA News",
  },
  description,
  other: { "clyvro-verification": "clyvro-verification=bgGvrkMEUkTOaufJIGTtWi-l7mQSZ4dmh-QpuoM4_WM" },
  // Indexing is off until the publication has real content. Flips on in Phase 2.
  robots: { index: false, follow: false },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "EPE LAWA News",
    title: "EPE LAWA News — Reporting from Epe Division",
    description,
    url: "/",
    images: [{ url: "/share.png", width: 1200, height: 630, alt: "EPE LAWA News" }],
  },
  twitter: { card: "summary_large_image", title: "EPE LAWA News", description, images: ["/share.png"] },
  icons: { icon: [{ url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" }, { url: "/icon.png", sizes: "192x192", type: "image/png" }], apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }] },
};

const navigation = mainNavigation();

/** News sections. Rendered as text until each route has real content behind it. */
const NEWS_SECTIONS = ["Politics", "Sports", "Culture", "Education", "Business", "Community"];

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
