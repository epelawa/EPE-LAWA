"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export default function ConfirmSubmit({
  message,
  children,
  className,
  confirmFirst = true,
  ...rest
}: {
  message: string;
  children: ReactNode;
  className?: string;
  confirmFirst?: boolean;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      aria-busy={pending}
      disabled={pending}
      onClick={(event) => {
        if (confirmFirst && !window.confirm(message)) event.preventDefault();
      }}
      {...rest}
    >
      {pending ? "Working…" : children}
    </button>
  );
}
