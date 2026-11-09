import type { Metadata } from "next";
import StaffSiteHeader from "../../../admin/components/site-header";
import { mainNavigation } from "../../../admin/lib/navigation";
import "./admin-shell.css";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const metadata: Metadata = {
  title: { default: "Staff workspace", template: "%s | EPE LAWA staff" },
  description: "Private EPE LAWA staff workspace.",
  robots: { index: false, follow: false, noarchive: true },
  alternates: { canonical: "/admin" },
};

const navigation = mainNavigation();

export default function SameOriginAdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="admin-shell">
      <StaffSiteHeader items={navigation} basePath="/admin" />
      <div className="admin-shell__content">{children}</div>
    </div>
  );
}
