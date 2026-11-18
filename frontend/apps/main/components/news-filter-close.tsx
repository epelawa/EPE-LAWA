"use client";

import type { ReactNode } from "react";

/** Close the menu immediately, including when the selected category is already active. */
export default function NewsFilterClose({ children }: { children: ReactNode }) {
  return <div onClick={(event) => {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest("a")) return;
    const details = target.closest("details");
    if (details) details.open = false;
  }} onKeyDown={(event) => {
    if (event.key !== "Escape") return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const details = target.closest("details");
    if (details?.open) { details.open = false; details.querySelector("summary")?.focus(); event.stopPropagation(); }
  }}>{children}</div>;
}
