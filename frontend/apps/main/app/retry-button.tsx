"use client";

import { buttonClassName } from "@epelawa/ui";

export default function RetryButton() {
  return (
    <button type="button" className={buttonClassName("primary")} onClick={() => window.location.reload()}>
      Try again
    </button>
  );
}
