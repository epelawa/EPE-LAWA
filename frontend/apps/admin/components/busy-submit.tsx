"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export default function BusySubmit({
  children,
  className,
  pendingLabel = "Working…",
}: {
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} aria-busy={pending} disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
