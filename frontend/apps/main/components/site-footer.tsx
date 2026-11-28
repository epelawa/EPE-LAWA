"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export default function SiteFooter({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const isProtected = pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/dashboard" || pathname.startsWith("/dashboard/")
    // The find-your-way page is a full-height chat screen with no footer (owner brief, 2026-11-28).
    || pathname === "/map";
  if (isProtected) return null;
  return <>{children}</>;
}
