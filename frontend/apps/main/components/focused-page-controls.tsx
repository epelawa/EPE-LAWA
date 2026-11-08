"use client";

import Link from "next/link";
import { BrandLockup } from "./brand";
import ThemeToggle from "./theme-toggle";

export default function FocusedPageControls() {
  return (
    <div className="focused-page-controls">
      <Link className="focused-page-controls__brand" href="/" aria-label="EPE LAWA home">
        <BrandLockup size={32} showPlace={false} />
      </Link>
      <ThemeToggle />
    </div>
  );
}
