"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export default function SiteFooter({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const isProtected = pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  if (isProtected) return null;
  return <>{children}</>;
}
