import type { Metadata } from "next";
import StaffSiteHeader from "../../../admin/components/site-header";
import { staffNavigation } from "../../../admin/lib/navigation";
import { createClient } from "../../../admin/lib/supabase";
import "./admin-shell.css";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const metadata: Metadata = {
  title: { default: "Staff workspace", template: "%s | EPE LAWA staff" },
  description: "Private EPE LAWA staff workspace.",
  robots: { index: false, follow: false, noarchive: true },
  alternates: { canonical: "/admin" },
};

async function navigationForRequest() {
  try {
    const db = await createClient();
    const { data: canManageStaff, error } = await db.rpc("staff_roles_authorized");
    return staffNavigation(!error && canManageStaff === true);
  } catch (error) {
    if (!(error instanceof Error) || error.message !== "Unauthorized") throw error;
    return staffNavigation(false);
  }
}

export default async function SameOriginAdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const navigation = await navigationForRequest();
  return (
    <div className="admin-shell">
      <StaffSiteHeader items={navigation} basePath="/admin" />
      <div className="admin-shell__content">{children}</div>
    </div>
  );
}
