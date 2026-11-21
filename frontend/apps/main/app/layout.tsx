import "@fontsource-variable/plus-jakarta-sans";
import "@epelawa/ui/tokens.css";
import "@epelawa/ui/ui.css";
import "./globals.css";
import "./native-controls.css";

export const dynamic = "force-dynamic";

export const viewport: Viewport = { themeColor: "#F1F4FA" };

import type { Metadata, Viewport } from "next";
import Script from "next/script";
import Connectivity from "./connectivity";
import { SponsorPopupPlacement } from "../components/sponsor-slot";
import SiteHeader from "../components/site-header";
import FloatingSupport from "../components/floating-support";
import NewsFooter from "../components/news-footer";
import SiteFooter from "../components/site-footer";
import { mainNavigation } from "../lib/navigation";
import { isIndexingAllowed, siteUrl } from "../lib/site";
import { themeScript } from "../lib/theme";
import SiteMotion from "../components/site-motion";
import ScrollToTop from "../components/scroll-to-top";
import ScrollProgress from "../components/scroll-progress";
import AuthCallbackErrorRouter from "../components/auth-callback-error-router";
import MobileBottomNav from "../components/mobile-bottom-nav";
import { createClient } from "../lib/supabase";
import { NotificationSoundListener } from "../components/notification-sound";
import ToastRegion from "../components/toast";
import SlashFocus from "../components/slash-focus";

const description =
  "News, community history, local discussion, maps, local business, tourism, radio and Who-is-Who for Epe Division.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "EPE LAWA — The Voice of Epe Division", template: "%s | EPE LAWA" },
  description,
  robots: isIndexingAllowed() ? undefined : { index: false, follow: false },
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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" style={{ colorScheme: "light" }} suppressHydrationWarning>
      <body>
        <Script strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
        <AuthCallbackErrorRouter />
        <SiteMotion />
        <NotificationSoundListener />
        <ScrollToTop />
        <ScrollProgress />
        <ToastRegion />
        <SlashFocus />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader items={navigation} />
        <main id="main" className="site-main" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter><NewsFooter listing /></SiteFooter>
        <AuthenticatedMobileNavigation />
        <Connectivity />
        <SponsorPopupPlacement />
        <FloatingSupport enabled={process.env.ENQUIRY_INTAKE_ENABLED === "true"} />

        {/* `components/notification-prompt.tsx` is intentionally NOT mounted.
            It asks for browser notification permission, then registers `/sw.js`
            and POSTs a subscription to `/api/notifications/subscribe` — neither
            exists, and no real VAPID public key is configured. Asking a visitor
            for a permission we cannot honour is worse than not asking. Re-mount
            it only once all four exist:
              1. `public/sw.js` — a service worker that handles `push`
              2. `app/api/notifications/subscribe/route.ts` — authenticated,
                 rate-limited, and writes to `push_subscriptions`
              3. a real VAPID key pair, with the private half server-side only
              4. something that actually sends a notification
            The component is guarded by the explicit public push enable flag and
            remains unmounted until the complete delivery path is available. */}
      </body>
    </html>
  );
}
