import { describe, expect, it } from "vitest";
import { systemReadiness } from "../apps/admin/lib/system-status";

describe("settings system readiness", () => {
  it("reports presence-only states with variable names and never values", () => {
    const secret = "super-private-token-value";
    const tiles = systemReadiness({
      R2_ACCOUNT_ID: "acct",
      R2_BUCKET_PRIVATE: "bucket",
      CLOUDFLARE_API_TOKEN: secret,
      BACKUP_DISPATCH_TOKEN: secret,
      BACKUP_WORKFLOW_REPO: "epelawa/EPE-LAWA",
      NEWSLETTER_SMTP_HOST: "smtp.example.test",
      NEWSLETTER_SMTP_USER: "user",
      NEWSLETTER_SMTP_PASSWORD: secret,
      NEWSLETTER_FROM: "sender@example.invalid",
      NEXT_PUBLIC_WEB_PUSH_ENABLED: "false",
    });

    const backups = tiles.find(tile => tile.label === "Database backups");
    expect(backups?.state).toBe("ready");
    const automation = tiles.find(tile => tile.label === "Backup automation");
    expect(automation).toEqual({
      label: "Backup automation",
      description: "On-demand and pre-restore snapshots can be dispatched.",
      state: "ready",
      missing: [],
      set: ["BACKUP_DISPATCH_TOKEN", "BACKUP_WORKFLOW_REPO"],
      href: "/backups",
    });
    const newsletter = tiles.find(tile => tile.label === "Newsletter sending");
    expect(newsletter?.missing).toEqual([]);
    expect(newsletter?.state).toBe("ready");
    expect(JSON.stringify(tiles)).not.toContain(secret);
  });

  it("marks incomplete groups with the names still missing", () => {
    const tiles = systemReadiness({ R2_ACCOUNT_ID: "acct" });
    const listing = tiles.find(tile => tile.label === "Database backups");
    expect(listing?.state).toBe("incomplete");
    expect(listing?.missing).toEqual(["R2_BUCKET_PRIVATE", "CLOUDFLARE_API_TOKEN"]);
    expect(listing?.set).toEqual(["R2_ACCOUNT_ID"]);
    const push = tiles.find(tile => tile.label === "Web push");
    expect(push?.state).toBe("off");
  });
});
