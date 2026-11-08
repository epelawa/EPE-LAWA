"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authLinkIssueFromLocation, authLinkIssuePath } from "../lib/auth-link-errors";

export default function AuthCallbackErrorRouter() {
  const router = useRouter();

  useEffect(() => {
    const issue = authLinkIssueFromLocation(window.location.search, window.location.hash);
    if (!issue) return;
    window.history.replaceState(window.history.state, "", window.location.pathname);
    router.replace(authLinkIssuePath(issue));
  }, [router]);

  return null;
}
