"use client";

import { useFormStatus } from "react-dom";
import { type ButtonHTMLAttributes } from "react";

export default function FormSubmitButton({
  children,
  pendingLabel = "Saving…",
  className = "",
  variant = "primary",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const { pending } = useFormStatus();

  // Map variant to btn class
  const btnClass = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    danger: "btn-danger",
    ghost: "btn-ghost",
  }[variant];

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${btnClass} ${pending ? "btn-busy" : ""} ${className}`.trim()}
      aria-busy={pending}
      {...rest}
    >
      {children}
    </button>
  );
}
