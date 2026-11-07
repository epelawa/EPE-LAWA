import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode, SVGProps } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";

export function buttonClassName(variant: ButtonVariant = "primary"): string {
  return `ep-button ep-button--${variant}`;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={`${buttonClassName(variant)} ${className}`.trim()} {...props} />;
}

export function Container({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`ep-ui-container ${className}`.trim()} {...props} />;
}

export function EmptyState({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`ep-ui-empty ${className}`.trim()} aria-label={title}>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {children ? <div className="ep-ui-empty__actions">{children}</div> : null}
    </section>
  );
}

export function Alert({
  children,
  variant = "info",
  className = "",
}: {
  children: ReactNode;
  variant?: "info" | "success" | "warning" | "error";
  className?: string;
}) {
  return (
    <div className={`ep-ui-alert ep-ui-alert--${variant} ${className}`.trim()} role={variant === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}

type IconProps = SVGProps<SVGSVGElement> & { size?: number };
function Icon({ size = 20, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return <Icon {...props}><path d="m6 6 12 12M18 6 6 18" /></Icon>;
}
export function SearchIcon(props: IconProps) {
  return <Icon {...props}><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></Icon>;
}
export function SunIcon(props: IconProps) {
  return <Icon {...props}><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></Icon>;
}
export function MoonIcon(props: IconProps) {
  return <Icon {...props}><path d="M20.4 15.4A8.5 8.5 0 0 1 8.6 3.6 8.6 8.6 0 1 0 20.4 15.4Z" /></Icon>;
}
export function MenuIcon(props: IconProps) {
  return <Icon {...props}><path d="M4 6h16M4 12h16M4 18h16" /></Icon>;
}
