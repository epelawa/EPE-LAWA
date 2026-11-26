import "@epelawa/ui/fonts.css";
import "@epelawa/ui/tokens.css";
import "@epelawa/ui/ui.css";
import "@epelawa/ui/forms.css";
import "./globals.css";
import "./native-controls.css";

export const dynamic = "force-dynamic";

export const viewport: Viewport = { themeColor: "#F1F4FA" };

import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import Connectivity from "./connectivity";
import SiteHeader from "../components/site-header";
import FloatingSupport from "../components/floating-support";
import NewsFooter from "../components/news-footer";
import SiteFooter from "../components/site-footer";
import { mainNavigation } from "../lib/navigation";
import { isIndexingAllowed, siteUrl, verificationTags } from "../lib/site";
import { turnstileSiteKey } from "../lib/turnstile";
import { themeScript } from "../lib/theme";
import SiteMotion from "../components/site-motion";
import ScrollToTop from "../components/scroll-to-top";
import AuthCallbackErrorRouter from "../components/auth-callback-error-router";
import MobileBottomNav from "../components/mobile-bottom-nav";
import { createClient } from "../lib/supabase";
import { readSiteLanguage } from "../lib/i18n";
import { NotificationSoundListener } from "../components/notification-sound";
import ToastRegion from "../components/toast";
import SlashFocus from "../components/slash-focus";

const description =
  "News, community history, local discussion, maps, local business, tourism, radio and Who-is-Who for Epe Division.";

const verification = verificationTags();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "EPE LAWA — The Voice of Epe Division", template: "%s | EPE LAWA" },
  description,
  robots: isIndexingAllowed() ? undefined : { index: false, follow: false },
  ...(verification.present ? { verification: verification.tags } : {}),
  alternates: { canonical: "/", types: { "application/rss+xml": "/feed.xml" } },
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

async function AuthenticatedMobileNavigation() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return <MobileBottomNav />;
  } catch {
    return null;
  }
}

function publicOrigin(raw: string | undefined): string | null {
  if (!raw) return null;
  try { return new URL(raw).origin; } catch { return null; }
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const siteLanguage = await readSiteLanguage();
  return (
    <html lang={siteLanguage === "yo" ? "yo" : "en"} data-theme="light" style={{ colorScheme: "light" }} suppressHydrationWarning>
      <head>
        {process.env.BROWSER_SMOKE_TEST !== "true" && (
          <script nonce={nonce} data-plerdy_code="1" dangerouslySetInnerHTML={{ __html: `(function(w,d){
  if(w.__plerdyCode)return;
  w.__plerdyCode=1;
  w._protocol=w.location.protocol==="https:"?"https://":"http://";
  w._site_hash_code="ae78ac2f6688b1ba8f347e3350b8a6a1";
  w._suid=83869;
  var s=d.createElement("script");
  s.async=true;
  s.referrerPolicy="strict-origin-when-cross-origin";
  s.src="https://a.plerdy.com/public/js/click/main.js?v="+Math.random();
  d.head.appendChild(s);
})(window,document);` }} />
        )}
      </head>
      <body>
        {publicOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL) ? (
          <link rel="preconnect" href={publicOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL) as string} crossOrigin="anonymous" />
        ) : null}
        {publicOrigin(process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL) ? (
          <link rel="preconnect" href={publicOrigin(process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL) as string} crossOrigin="anonymous" />
        ) : null}
        {turnstileSiteKey() ? (
          <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer nonce={nonce} />
        ) : null}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
        <AuthCallbackErrorRouter />
        <SiteMotion />
        <NotificationSoundListener />
        <ScrollToTop />
        <ToastRegion />
        <SlashFocus />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader items={navigation} lang={siteLanguage} />
        <main id="main" className="site-main" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter><Suspense fallback={null}><NewsFooter listing /></Suspense></SiteFooter>
        <Suspense fallback={null}><AuthenticatedMobileNavigation /></Suspense>
        <Connectivity />
        <FloatingSupport enabled={process.env.ENQUIRY_INTAKE_ENABLED === "true"} />

      </body>
    </html>
  );
}
