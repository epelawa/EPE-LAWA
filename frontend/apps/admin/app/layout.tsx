import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import "@epelawa/ui/tokens.css";
import "@epelawa/ui/ui.css";
import "./globals.css";
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

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "EPE LAWA Admin",
  description: "Staff and moderator dashboard for EPE LAWA.",
  robots: { index: false, follow: false },
};

const navigation = mainNavigation();

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body>
        <Script strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
        <a className="skip-link" href="#main">Skip to content</a>
        <SiteHeader items={navigation} />
        <main id="main" className="site-main" tabIndex={-1}>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
