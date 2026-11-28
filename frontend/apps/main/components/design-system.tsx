import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import { ArrowRightIcon } from "./icons";

export function PageFrame({ children, className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`ui-page ${className}`} {...props}>{children}</div>;
}

export function PageIntro({ title, description, actions, meta }: {
  title: ReactNode; description?: ReactNode; actions?: ReactNode; meta?: ReactNode;
}) {
  return <header className="ui-page-intro"><div className="ui-page-intro__copy"><h1>{title}</h1>{description ? <div className="ui-page-intro__description">{description}</div> : null}{meta ? <div className="ui-meta">{meta}</div> : null}</div>{actions ? <div className="ui-page-intro__actions">{actions}</div> : null}</header>;
}

export function Panel({ children, className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`ui-panel ${className}`} {...props}>{children}</div>;
}

export function SectionHeading({ title, description, action, id }: {
  title: ReactNode; description?: ReactNode; action?: ReactNode; id?: string;
}) {
  return <div className="ui-section-heading"><div><h2 id={id}>{title}</h2>{description ? <div className="ui-muted">{description}</div> : null}</div>{action ? <div>{action}</div> : null}</div>;
}

/** `as="h1"` when the panel is the whole page (error/unavailable states), so the page still has one h1. */
export function EmptyPanel({ title, description, actions, icon, as: Heading = "h2" }: {
  title: ReactNode; description: ReactNode; actions?: ReactNode; icon?: ReactNode; as?: "h1" | "h2";
}) {
  return <div className="ui-empty">{icon ? <div className="ui-empty__icon" aria-hidden="true">{icon}</div> : <span className="ui-empty__mark" aria-hidden="true" />}<Heading>{title}</Heading><div className="ui-muted">{description}</div>{actions ? <div className="ui-actions">{actions}</div> : null}</div>;
}

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" }) {
  return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>;
}

export function Notice({ children, tone = "neutral", className = "", ...props }: HTMLAttributes<HTMLDivElement> & { tone?: "neutral" | "success" | "warning" | "danger" }) {
  return <div className={`ui-notice ui-notice--${tone} ${className}`} {...props}>{children}</div>;
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="ui-text-link">{children}<ArrowRightIcon size={16} aria-hidden="true" /></Link>;
}
