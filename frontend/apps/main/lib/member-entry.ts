/**
 * Decides what `/dashboard` should render for the signed-in account.
 *
 * The dashboard is the only member landing route: there is no separate
 * post-sign-in interstitial. A complete profile goes straight to the
 * member space; an incomplete one gets its next step (verify, choose a handle,
 * or retry setup) inside the same route.
 */
export type MemberProfileSnapshot = {
  user_id: string;
  handle: string;
  display_name: string;
  deleted_at: string | null;
};

export type HandleAvailability = "available" | "taken" | "unavailable";

export type MemberEntryInput = {
  emailConfirmed: boolean;
  profile: MemberProfileSnapshot | null;
  /** `not-needed` means a profile was already loaded; `created` means the bootstrap RPC succeeded. */
  bootstrap: "not-needed" | "created" | "failed" | "unavailable";
  displayName: string;
  rawHandle: string;
  rawHandleValid: boolean;
  handleAvailability: HandleAvailability;
};

export type MemberEntryDecision =
  | { kind: "ready" }
  | { kind: "unverified" }
  | { kind: "deleted" }
  | { kind: "needs-handle"; initialHandle: string; note?: string }
  | { kind: "setup-error" };

export const MEMBER_SERVICE_LINKS = [
  {
    href: "/forum",
    label: "Community forum",
    description: "Join the conversation and reply to Epe voices.",
  },
  {
    href: "/business-directory/orders",
    label: "Order requests",
    description: "Follow requests made through the business directory.",
  },
  {
    href: "/",
    label: "Explore EPE LAWA",
    description: "Return to the public newsroom, radio and community pages.",
  },
] as const;

export function decideMemberEntry(input: MemberEntryInput): MemberEntryDecision {
  if (!input.emailConfirmed) return { kind: "unverified" };
  if (input.profile?.deleted_at) return { kind: "deleted" };
  if (input.profile) return { kind: "ready" };
  if (input.bootstrap === "unavailable") return { kind: "setup-error" };
  if (input.bootstrap === "created") return { kind: "setup-error" };

  const displayName = input.displayName.trim();
  if (displayName.length < 1 || displayName.length > 60) return { kind: "setup-error" };
  if (input.rawHandleValid && input.handleAvailability === "unavailable") return { kind: "setup-error" };

  if (!input.rawHandleValid || input.handleAvailability === "taken") {
    return {
      kind: "needs-handle",
      initialHandle: input.rawHandle,
      note: input.handleAvailability === "taken"
        ? "Your current handle is reserved or already in use. Choose another available handle to continue."
        : undefined,
    };
  }

  return { kind: "setup-error" };
}
