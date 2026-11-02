import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

/**
 * Class string for anything that must look like a button but is a link — for example a
 * Next.js `<Link>`. Kept separate so this package never depends on a router.
 */
export function buttonClassName(variant: ButtonVariant = "primary"): string {
  return `ep-btn ep-btn--${variant}`;
}

type ButtonProps = {
  variant?: ButtonVariant;
  /** Disables the button and swaps the label for a spinner without changing the width. */
  loading?: boolean;
  /** Announced while loading. Defaults to "Working". */
  loadingLabel?: string;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

export function Button({
  variant = "primary",
  loading = false,
  loadingLabel = "Working",
  children,
  disabled = false,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={buttonClassName(variant)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      <span className="ep-btn__label">{children}</span>
      {loading ? <span className="ep-btn__spinner" aria-hidden="true" /> : null}
      {loading ? <span className="ep-sr-only">{loadingLabel}</span> : null}
    </button>
  );
}
