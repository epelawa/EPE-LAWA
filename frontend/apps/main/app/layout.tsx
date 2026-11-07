import "./globals.css";

export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Script from "next/script";
import Connectivity from "./connectivity";
import SiteHeader from "../components/site-header";
import SiteFooter from "../components/site-footer";
import CookieBanner from "../components/cookie-banner";
import { mainNavigation } from "../lib/navigation";
import { isIndexingAllowed, siteUrl } from "../lib/site";
import { themeScript } from "../lib/theme";

const description =
  "What EPE LAWA is, who runs it, where it broadcasts and how it is funded.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "EPE LAWA — The Voice of Epe Division", template: "%s | EPE LAWA" },
  description,
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
    <html lang="en" className="font-sans">
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
        <CookieBanner />

        {/* `components/notification-prompt.tsx` is intentionally NOT mounted.
            It asks for browser notification permission, then registers `/sw.js`
            and POSTs a subscription to `/api/notifications/subscribe` — neither
            of those exists, and `lib/vapid.ts` holds a key that was never
            issued. Asking a visitor for a permission we cannot honour is worse
            than not asking. Re-mount it only once all four exist:
              1. `public/sw.js` — a service worker that handles `push`
              2. `app/api/notifications/subscribe/route.ts` — authenticated,
                 rate-limited, and writes to `push_subscriptions`
              3. a real VAPID key pair, with the private half server-side only
              4. something that actually sends a notification
            The component file itself is kept, unchanged, so the work is not
            thrown away. */}
      </body>
    </html>
  );
}
