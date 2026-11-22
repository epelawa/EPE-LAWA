"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { pushToast } from "../../main/components/toast";

export type FeedbackTone = "success" | "error";

/**
 * Reading the desk feedback keys that server actions leave in the URL and
 * turning each one into a toast. Phrases stay grounded in the page copy;
 * unmatched keys fall back to a short honest line instead of a guess.
 */
export function describeFeedback(entries: [string, string][]): { tone: FeedbackTone; message: string } | null {
  const map: Record<string, { tone: FeedbackTone; message: string }> = {
    "deleted=1": { tone: "success", message: "Permanently deleted." },
    "status=deleted": { tone: "success", message: "Permanently deleted." },
    "added=1": { tone: "success", message: "Saved to the desk." },
    "updated=1": { tone: "success", message: "Changes saved." },
    "decided=1": { tone: "success", message: "Decision recorded." },
    "saved=1": { tone: "success", message: "Changes saved." },
    "maintenance=saved": { tone: "success", message: "Maintenance setting updated." },
    "authority=restored": { tone: "success", message: "Owner capabilities are in place." },
    "claims=1": { tone: "success", message: "Claim decision recorded." },
    "published=1": { tone: "success", message: "Published." },
    "created=1": { tone: "success", message: "Created." },
    "featured=1": { tone: "success", message: "Featured line-up saved." },
    "tags=1": { tone: "success", message: "Topic tags saved." },
    "breaking=1": { tone: "success", message: "Breaking-story banner updated." },
    "review=updated": { tone: "success", message: "Review saved." },
    "status=sent": { tone: "success", message: "Sent." },
    "error=invalid": { tone: "error", message: "Some details were invalid. Check the message on the page." },
    "error=delete_confirmation": { tone: "error", message: "Tick the confirm box first." },
    "error=delete": { tone: "error", message: "The deletion did not go through. Check the message on the page." },
    "error=action": { tone: "error", message: "The action did not complete. Check the message on the page." },
    "error=action-failed": { tone: "error", message: "The action did not complete. Check the message on the page." },
    "error=claim": { tone: "error", message: "The claim decision did not go through." },
    "error=featured": { tone: "error", message: "The line-up change did not go through." },
    "error=forbidden": { tone: "error", message: "Not allowed with your current access." },
    "maintenance=failed": { tone: "error", message: "The setting could not be updated. Refresh and try again." },
    "maintenance=unavailable": { tone: "error", message: "Maintenance is not configured on this deployment yet." },
    "authority=failed": { tone: "error", message: "Owner authority could not be restored. Try again." },
    "review=failed": { tone: "error", message: "The review did not save." },
    "review=denied": { tone: "error", message: "Not allowed with your current access." },
    "review=invalid": { tone: "error", message: "Some review details were invalid." },
    "result=denied": { tone: "error", message: "Not allowed with your current access." },
    "result=invalid": { tone: "error", message: "Some details were invalid. Check the message on the page." },
    "result=partial": { tone: "error", message: "Some selections saved; the rest need another try." },
    "conflict=1": { tone: "error", message: "That change conflicts with another one. Reload and try again." },
  };
  for (const [key, value] of entries) {
    const hit = map[`${key}=${value}`];
    if (hit) return hit;
    if ((key === "error" || key === "result" || key === "review") && value !== "updated") {
      return { tone: "error", message: "That action didn't complete — the details are on the page." };
    }
  }
  return null;
}

export default function FeedbackToasts() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  useEffect(() => {
    if (!searchParams.size) return;
    const entries = [...searchParams.entries()];
    const feedback = describeFeedback(entries);
    if (!feedback) return;
    pushToast(feedback.tone, feedback.message);
    const next = new URLSearchParams(searchParams.toString());
    let changed = false;
    for (const [key] of entries) {
      if (["error", "result", "status", "saved", "added", "updated", "deleted", "decided", "claims", "published", "created", "featured", "tags", "breaking", "review", "maintenance", "authority", "conflict"].includes(key)) {
        next.delete(key);
        changed = true;
      }
    }
    if (changed) {
      const query = next.toString();
      window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, pathname]);
  return null;
}
