import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "@epelawa/ui/fonts.css";
import { headers } from "next/headers";
import "@epelawa/ui/tokens.css";
import "@epelawa/ui/ui.css";
import "@epelawa/ui/forms.css";
import "./globals.css";
import "./native-controls.css";
import "./staff-feedback.css";
import AdminSidebar from "../components/admin-sidebar";
import SiteHeader from "../components/site-header";
import SiteFooter from "../components/site-footer";
import { staffNavigation, filterNavigationByCapabilities } from "../lib/navigation";
import { createClient } from "../lib/supabase";
import { siteUrl } from "../lib/site";
import { ADMIN_BASE_PATH } from "../lib/admin-path";
import { themeScript } from "../lib/theme";
import ToastRegion from "../../main/components/toast";
import FeedbackToasts from "../components/feedback-toasts";
import { turnstileSiteKey } from "../../main/lib/turnstile";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "EPE LAWA Admin",
  description: "Staff and moderator dashboard for EPE LAWA.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#F1F4FA" };

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type AdminIdentity = { email: string | null; role: string; capabilities?: string[] };

async function loadIdentity(): Promise<AdminIdentity> {
  try {
    const db = await createClient();
    const { data: audience } = await db.auth.getUser();
    const email = audience?.user?.email ?? null;
    let role = "Staff";
    try {
      const { data } = await db.rpc("staff_role_staff_directory", { p_search: email ?? "", p_limit: 1 });
      const match = (data ?? []).find((row: { email?: string | null }) => row.email?.toLowerCase() === email?.toLowerCase());
      const roleIds: string[] = Array.isArray(match?.role_ids) ? match.role_ids : [];
      if (roleIds.length) {
        const { data: roles } = await db.from("staff_roles").select("id,name").in("id", roleIds);
        const labels = (roles ?? []).map((row) => String(row.name)).filter(Boolean);
        role = labels.length ? labels.join(" · ") : "Staff";
      }
    } catch {
      role = "Staff";
    }
    return { email, role };
  } catch {
    return { email: null, role: "Staff" };
  }
}

function publicOrigin(raw: string | undefined): string | null {
  if (!raw) return null;
  try { return new URL(raw).origin; } catch { return null; }
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  let navigation = staffNavigation(false);
  let identity: AdminIdentity | null = null;
  try {
    const db = await createClient();
    const { data: canManageStaff, error } = await db.rpc("staff_roles_authorized");
    const allNavItems = staffNavigation(!error && canManageStaff === true);
    identity = await loadIdentity();
    // Filter navigation based on user's capabilities
    if (identity?.capabilities) {
      navigation = filterNavigationByCapabilities(allNavItems, identity.capabilities);
    } else {
      navigation = allNavItems;
    }
  } catch (error) {
    if (!(error instanceof Error) || error.message !== "Unauthorized") throw error;
  }
  const staffWorkspace = identity !== null;
  return (
    <html lang="en" data-theme="light" style={{ colorScheme: "light" }} suppressHydrationWarning>
      <body data-admin-shell={staffWorkspace ? "sidebar" : "plain"}>
        {publicOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL) ? (
          <link rel="preconnect" href={publicOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL) as string} crossOrigin="anonymous" />
        ) : null}
        {publicOrigin(process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL) ? (
          <link rel="preconnect" href={publicOrigin(process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL) as string} crossOrigin="anonymous" />
        ) : null}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* The admin sign-in renders a Turnstile field when a site key is set; this standalone document must load the widget itself (CodeRabbit review on PR #282). */}
        {turnstileSiteKey() ? (
          <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer nonce={nonce} />
        ) : null}
        <ToastRegion />
        <Suspense fallback={null}>
          <FeedbackToasts />
        </Suspense>
        <a className="skip-link" href="#skip-target">Skip to content</a>
        {staffWorkspace ? (
          <AdminSidebar items={navigation} userEmail={identity?.email ?? null} userRole={identity?.role} basePath={ADMIN_BASE_PATH} />
        ) : (
          <SiteHeader items={navigation} basePath={ADMIN_BASE_PATH} />
        )}
        <main className="site-main" id="skip-target" tabIndex={-1} aria-label="Admin workspace content">{children}</main>
        <SiteFooter />
        {/* Turn 4 owner brief: no floating Support button on the staff side. */}
      </body>
    </html>
  );
}
