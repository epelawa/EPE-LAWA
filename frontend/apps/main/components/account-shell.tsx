import type { ReactNode } from "react";
import FocusedPageControls from "./focused-page-controls";

export default function AccountShell({
  eyebrow,
  title,
  description,
  children,
  showThemeToggle = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  showThemeToggle?: boolean;
}) {
  return (
    <section className="auth-page" aria-labelledby="auth-title">
      <div className="auth-frame">
        <header className="auth-art">
          <span className="auth-art__shape auth-art__shape--left" aria-hidden="true" />
          <span className="auth-art__shape auth-art__shape--right" aria-hidden="true" />
          <span className="auth-art__texture" aria-hidden="true" />
          <FocusedPageControls showThemeToggle={showThemeToggle} />
          <div className="auth-art__heading">
            <p className="auth-art__eyebrow">{eyebrow}</p>
            <h1 id="auth-title">{title}</h1>
            <p className="auth-art__description">{description}</p>
          </div>
        </header>
        <div className="auth-card">
          <div className="auth-card__content">{children}</div>
        </div>
      </div>
    </section>
  );
}
