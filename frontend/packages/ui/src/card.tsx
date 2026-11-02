import type { ReactNode } from "react";

/**
 * One elevation, no hover lift. A card that reacts to the pointer but does nothing when
 * clicked is a lie, so the lift is reserved for cards that are genuinely links.
 */
export function Card({ children }: { children: ReactNode }) {
  return <div className="ep-card">{children}</div>;
}
