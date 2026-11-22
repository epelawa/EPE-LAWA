"use client";

import { useEffect } from "react";

/**
 * Any form submission anywhere in the staff shell marks its submitter button
 * busy so a small spinner shows until the server action answers or the page
 * navigates. Buttons that already manage their own pending state through
 * useFormStatus mark themselves with data-pending-self-managed and are left alone.
 */
export default function GlobalSubmitBusy() {
  useEffect(() => {
    const onSubmit = (event: SubmitEvent) => {
      const submitter = event.submitter;
      if (
        !submitter ||
        (submitter instanceof HTMLButtonElement && submitter.dataset.pendingSelfManaged === "true") ||
        submitter.getAttribute("aria-busy") === "true"
      ) {
        return;
      }
      submitter.setAttribute("aria-busy", "true");
      window.setTimeout(() => {
        if (submitter.isConnected && submitter.getAttribute("aria-busy") === "true") {
          submitter.removeAttribute("aria-busy");
        }
      }, 10_000);
    };
    document.addEventListener("submit", onSubmit, true);
    return () => document.removeEventListener("submit", onSubmit, true);
  }, []);
  return null;
}
