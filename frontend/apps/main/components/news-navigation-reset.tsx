"use client";

import { useSearchParams } from "next/navigation";
import { useLayoutEffect } from "react";

/** News filters and pagination are query-only navigations and must start at the top. */
export default function NewsNavigationReset() {
  const params = useSearchParams();
  const search = params.toString();
  useLayoutEffect(() => {
    if (window.location.hash) return;
    const reset = () => window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    reset();
    let second = 0;
    const first = requestAnimationFrame(() => { reset(); second = requestAnimationFrame(reset); });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [search]);
  return null;
}
