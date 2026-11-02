import type { ReactNode } from "react";

export type AlertTone = "info" | "success" | "warning" | "error";

type AlertProps = {
  tone?: AlertTone;
  title?: string;
  /** Set only when the alert appears in response to something the user just did. */
  live?: boolean;
  children: ReactNode;
};

/**
 * Inline notice. `live` is opt-in: a live region on a notice that was already on the
 * page makes a screen reader repeat content for no reason.
 */
export function Alert({ tone = "info", title, live = false, children }: AlertProps) {
  return (
    <div className={`ep-alert ep-alert--${tone}`} role={live ? "alert" : undefined}>
      {title ? <p className="ep-alert__title">{title}</p> : null}
      <div className="ep-alert__body">{children}</div>
    </div>
  );
}
