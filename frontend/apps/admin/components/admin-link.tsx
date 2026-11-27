"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";
import { adminRouterHref } from "../lib/admin-path";

function LinkFeedback({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  return <>
    <span className="admin-sidebar__nav-spinner" data-active={pending} aria-hidden="true" />
    <span className="sr-only" role="status">{pending ? `Loading ${label}` : ""}</span>
  </>;
}

export default function AdminLink({ href, children, pendingLabel, ...props }: Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  pendingLabel?: string;
}) {
  return <Link href={adminRouterHref(href)} {...props}>
    {children}
    {pendingLabel && <LinkFeedback label={pendingLabel} />}
  </Link>;
}
