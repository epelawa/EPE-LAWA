import type { ReactNode } from "react";

type EmptyStateProps = {
  /** Decorative glyph. Pass one of the icons from this package. */
  icon?: ReactNode;
  /** One sentence saying why it is empty. Not "No data available". */
  children: ReactNode;
  /** One next action, and only when one genuinely exists. */
  action?: ReactNode;
};

/**
 * Empty is a design state, not an error. It never fills the gap with placeholder content
 * and it never claims something is loading.
 */
export function EmptyState({ icon, children, action }: EmptyStateProps) {
  return (
    <div className="ep-empty">
      {icon ? (
        <span className="ep-empty__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <p className="ep-empty__text">{children}</p>
      {action ? <p className="ep-empty__action">{action}</p> : null}
    </div>
  );
}
