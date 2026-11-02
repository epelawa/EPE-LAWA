import type { ReactNode } from "react";

/** Page-width wrapper: max 1200px, 16px gutters below 480, 20px above. */
export function Container({ children }: { children: ReactNode }) {
  return <div className="ep-container">{children}</div>;
}
