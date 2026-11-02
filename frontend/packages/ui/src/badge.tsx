import type { ReactNode } from "react";
import { CheckIcon } from "./icons";

export type BadgeTone = "verified" | "unverified" | "neutral";

/**
 * Status pill. The word carries the meaning — colour is never the only signal, so
 * `verified` ships with a check mark and an explicit label.
 */
export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={`ep-badge ep-badge--${tone}`}>
      {tone === "verified" ? <CheckIcon size={14} /> : null}
      {children}
    </span>
  );
}
