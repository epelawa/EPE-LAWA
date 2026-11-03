import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import Connectivity from "./connectivity";
import SiteHeader from "../components/site-header";
import SiteFooter from "../components/site-footer";
import { mainNavigation } from "../lib/navigation";
import { isIndexingAllowed, siteUrl } from "../lib/site";
import { themeScript } from "../lib/theme";

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
  "EPE LAWA brings news, conversation, radio and local businesses together for Epe Division, Lagos State, at home and abroad.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "EPE LAWA — The Voice of Epe Division", template: "%s | EPE LAWA" },
  description,
  other: { "clyvro-verification": "clyvro-verification=bgGvrkMEUkTOaufJIGTtWi-l7mQSZ4dmh-QpuoM4_WM" },
  robots: isIndexingAllowed() ? undefined : { index: false, follow: false },
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

const navigation = mainNavigation();

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body>
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
