"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authLinkIssueFromLocation, authLinkIssuePath } from "../lib/auth-link-errors";
import { authErrorToastMessage, normalizeCampaignAttribution } from "../lib/campaign-attribution";
import { pushToast } from "./toast";

export default function AuthCallbackErrorRouter() {
  const router = useRouter();

  useEffect(() => {
    const url = new URL(window.location.href);
    let changed = normalizeCampaignAttribution(url.searchParams);
    const message = authErrorToastMessage(url.searchParams);
    if (message) {
      pushToast("error", message);
      url.searchParams.delete("errMessage");
      url.searchParams.delete("from");
      changed = true;
    }
    if (changed) {
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
    const issue = authLinkIssueFromLocation(url.search, url.hash);
    if (!issue) return;
    window.history.replaceState(window.history.state, "", url.pathname);
    router.replace(authLinkIssuePath(issue));
  }, [router]);

  return null;
}
