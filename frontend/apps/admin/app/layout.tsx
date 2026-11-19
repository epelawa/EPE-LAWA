import type { Metadata, Viewport } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import Script from "next/script";
import "@epelawa/ui/tokens.css";
import "@epelawa/ui/ui.css";
import "./globals.css";
import "./native-controls.css";
import SiteHeader from "../components/site-header";
import SiteFooter from "../components/site-footer";
import { staffNavigation } from "../lib/navigation";
import { createClient } from "../lib/supabase";
import { siteUrl } from "../lib/site";
import { themeScript } from "../lib/theme";
import SiteMotion from "../components/site-motion";
import FloatingSupport from "../../main/components/floating-support";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "EPE LAWA Admin",
  description: "Staff and moderator dashboard for EPE LAWA.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#F1F4FA" };

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let navigation = staffNavigation(false);
  try {
    const db = await createClient();
    const { data: canManageStaff, error } = await db.rpc("staff_roles_authorized");
    navigation = staffNavigation(!error && canManageStaff === true);
  } catch (error) {
    if (!(error instanceof Error) || error.message !== "Unauthorized") throw error;
  }
  return (
    <html lang="en" data-theme="light" style={{ colorScheme: "light" }} suppressHydrationWarning>
      <body>
        <Script strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
        <SiteMotion />
        <a className="skip-link" href="#skip-target">Skip to content</a>
        <SiteHeader items={navigation} />
        <main className="site-main" id="skip-target" tabIndex={-1} aria-label="Admin workspace content">{children}</main>
        <SiteFooter />
        <FloatingSupport href={`${siteUrl}/support`} privacyHref={`${siteUrl}/privacy`} enabled={process.env.ENQUIRY_INTAKE_ENABLED === "true"} />
      </body>
    </html>
  );
}
