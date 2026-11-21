import { describe, expect, it } from "vitest";
import {
  decideMemberEntry,
  MEMBER_SERVICE_LINKS,
  type MemberEntryInput,
  type MemberProfileSnapshot,
} from "../apps/main/lib/member-entry";

const profile: MemberProfileSnapshot = {
  user_id: "00000000-0000-4000-8000-000000000001",
  handle: "epe_reader",
  display_name: "Epe Reader",
  deleted_at: null,
};

function input(overrides: Partial<MemberEntryInput> = {}): MemberEntryInput {
  return {
    emailConfirmed: true,
    profile,
    bootstrap: "not-needed",
    displayName: "Epe Reader",
    rawHandle: "epe_reader",
    rawHandleValid: true,
    handleAvailability: "available",
    ...overrides,
  };
}

describe("decideMemberEntry", () => {
  it("sends a complete profile straight to the member space", () => {
    expect(decideMemberEntry(input())).toEqual({ kind: "ready" });
  });

  it("never shows an interstitial for a verified profile with a valid handle", () => {
    expect(decideMemberEntry(input({ profile: null, bootstrap: "failed" }))).toEqual({
      kind: "setup-error",
    });
  });

  it("asks an unverified account to verify before any setup", () => {
    expect(decideMemberEntry(input({ emailConfirmed: false }))).toEqual({ kind: "unverified" });
  });

  it("treats a soft-deleted profile as signed out", () => {
    expect(decideMemberEntry(input({ profile: { ...profile, deleted_at: "2026-11-16T00:00:00Z" } }))).toEqual({
      kind: "deleted",
    });
  });

  it("offers handle completion for an invalid or taken handle", () => {
    expect(decideMemberEntry(input({
      profile: null,
      bootstrap: "failed",
      rawHandle: "bad handle",
      rawHandleValid: false,
      handleAvailability: "unavailable",
    }))).toMatchObject({ kind: "needs-handle", initialHandle: "bad handle" });

    expect(decideMemberEntry(input({
      profile: null,
      bootstrap: "failed",
      rawHandle: "epe_reader",
      handleAvailability: "taken",
    }))).toMatchObject({
      kind: "needs-handle",
      note: expect.stringMatching(/reserved or already in use/i),
    });
  });

  it("does not offer a handle form when the member profile service is unavailable", () => {
    expect(decideMemberEntry(input({
      profile: null,
      bootstrap: "unavailable",
      rawHandle: "bad handle",
      rawHandleValid: false,
    }))).toEqual({ kind: "setup-error" });

    expect(decideMemberEntry(input({
      profile: null,
      bootstrap: "failed",
      rawHandle: "epe_reader",
      handleAvailability: "unavailable",
    }))).toEqual({ kind: "setup-error" });
  });

  it("requires a display name before it will create a profile", () => {
    expect(decideMemberEntry(input({ profile: null, bootstrap: "failed", displayName: "  " }))).toEqual({
      kind: "setup-error",
    });
  });

  it("does not pretend a created profile exists when the refetch returned nothing", () => {
    expect(decideMemberEntry(input({ profile: null, bootstrap: "created" }))).toEqual({
      kind: "setup-error",
    });
  });
});

describe("member service links", () => {
  it("keeps the old post-sign-in destinations inside the dashboard", () => {
    expect(MEMBER_SERVICE_LINKS.map((link) => link.href)).toEqual([
      "/forum",
      "/",
    ]);
    for (const link of MEMBER_SERVICE_LINKS) {
      expect(link.label.length).toBeGreaterThan(3);
      expect(link.description.length).toBeGreaterThan(10);
    }
  });
});
