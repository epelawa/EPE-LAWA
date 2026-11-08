import Link from "next/link";
import type { ReactNode } from "react";
import FocusedPageControls from "./focused-page-controls";

export default function AccountShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="auth-page" aria-labelledby="auth-title">
      <div className="auth-card">
        <FocusedPageControls />
        <header className="auth-card__heading">
          <p className="ui-eyebrow">{eyebrow}</p>
          <h1 id="auth-title">{title}</h1>
          <p className="auth-description">{description}</p>
        </header>
        <div className="auth-card__content">{children}</div>
        <p className="auth-home">
          <Link href="/">Back to EPE LAWA</Link>
        </p>
      </div>
    </section>
  );
}
