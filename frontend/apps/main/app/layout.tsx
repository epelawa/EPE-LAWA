import "@fontsource-variable/plus-jakarta-sans";
import "@epelawa/ui/tokens.css";
import "@epelawa/ui/ui.css";
import "./globals.css";
import "./native-controls.css";

export const dynamic = "force-dynamic";

export const viewport: Viewport = { themeColor: "#F1F4FA" };

import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import Connectivity from "./connectivity";
import { SponsorPopupPlacement } from "../components/sponsor-slot";
import SiteHeader from "../components/site-header";
import FloatingSupport from "../components/floating-support";
import NewsFooter from "../components/news-footer";
import SiteFooter from "../components/site-footer";
import { mainNavigation } from "../lib/navigation";
import { isIndexingAllowed, siteUrl, verificationTags } from "../lib/site";
import { themeScript } from "../lib/theme";
import SiteMotion from "../components/site-motion";
import ScrollToTop from "../components/scroll-to-top";
import ScrollProgress from "../components/scroll-progress";
import AuthCallbackErrorRouter from "../components/auth-callback-error-router";
import MobileBottomNav from "../components/mobile-bottom-nav";
import { createClient } from "../lib/supabase";
import { readSiteLanguage } from "../lib/i18n";
import { NotificationSoundListener } from "../components/notification-sound";
import NotificationPrompt from "../components/notification-prompt";
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

function preconnectOrigins(): string[] {
  const origins = new Set<string>();
  try {
    const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabase) origins.add(new URL(supabase).origin);
  } catch { /* ignore malformed configuration */ }
  try {
    const r2 = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL;
    if (r2) origins.add(new URL(r2).origin);
  } catch { /* ignore malformed configuration */ }
  return [...origins];
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const siteLanguage = await readSiteLanguage();
  return (
    <html lang={siteLanguage === "yo" ? "yo" : "en"} data-theme="light" style={{ colorScheme: "light" }} suppressHydrationWarning>
      <body>
        {preconnectOrigins().map((origin) => (
          <link key={origin} rel="preconnect" href={origin} crossOrigin="anonymous" />
        ))}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
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
        <SiteHeader items={navigation} lang={siteLanguage} />
        <main id="main" className="site-main" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter><NewsFooter listing /></SiteFooter>
        <AuthenticatedMobileNavigation />
        <Connectivity />
        <SponsorPopupPlacement />
        <FloatingSupport enabled={process.env.ENQUIRY_INTAKE_ENABLED === "true"} />

        {/* Web-push opt-in. The component itself stays dark unless
            NEXT_PUBLIC_WEB_PUSH_ENABLED === "true" and a real VAPID public key
            is configured, so enabling delivery is a Vercel-variable change only.
            The matching private key stays server-side, and the sender (what
            pushes article/radio events to stored subscriptions) is the last
            unbuilt half of web push — see docs/00-master-plan.md §8. */}
        <NotificationPrompt />
      </body>
    </html>
  );
}
