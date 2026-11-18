import { describe, expect, it } from "vitest";
import { configurationStatus } from "../apps/admin/lib/configuration-inventory";
describe("deployment configuration checklist", () => {
  it("reports only allowlisted names and status without returning secrets", () => {
    const secret = "private-non-placeholder-value";
    const rows = configurationStatus({ AUTH_GMAIL_APP_PASSWORD: secret, AUTH_EMAIL_FROM: "replace-with-approved-sender@example.invalid", UNKNOWN_PRIVATE_VALUE: secret });
    expect(rows.find(x => x.name === "AUTH_GMAIL_APP_PASSWORD")?.status).toBe("present");
    expect(rows.find(x => x.name === "AUTH_EMAIL_FROM")?.status).toBe("sample");
    expect(rows.find(x => x.name === "FORM_RATE_SECRET")?.status).toBe("missing");
    expect(JSON.stringify(rows)).not.toContain(secret);
    expect(rows.some(x => x.name === "UNKNOWN_PRIVATE_VALUE")).toBe(false);
  });
});
