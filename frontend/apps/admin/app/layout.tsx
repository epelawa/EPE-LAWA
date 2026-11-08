import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "@epelawa/ui/tokens.css";
import "@epelawa/ui/ui.css";
import "./globals.css";
import SiteHeader from "../components/site-header";
import SiteFooter from "../components/site-footer";
import { mainNavigation } from "../lib/navigation";
import { siteUrl } from "../lib/site";
import { themeScript } from "../lib/theme";
import SiteMotion from "../components/site-motion";

const bodyFont = Inter({
  subsets: ["latin"],
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
    <html lang="en" className={bodyFont.variable}>
      <body>
        <Script strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
        <SiteMotion />
        <a className="skip-link" href="#skip-target">Skip to content</a>
        <SiteHeader items={navigation} />
        <main className="site-main" id="skip-target" tabIndex={-1} aria-label="Admin workspace content">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
