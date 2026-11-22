import { describe, expect, it } from "vitest";
import { describeFeedback } from "../apps/admin/components/feedback-toasts";

describe("redirect feedback toasts", () => {
  it("maps known success keys to success toasts", () => {
    expect(describeFeedback([["deleted", "1"]])).toMatchObject({ tone: "success" });
    expect(describeFeedback([["updated", "1"]])).toMatchObject({ tone: "success" });
    expect(describeFeedback([["authority", "restored"]])).toMatchObject({ tone: "success", message: "Owner capabilities are in place." });
    expect(describeFeedback([["maintenance", "saved"]])).toMatchObject({ tone: "success" });
  });

  it("maps known failure keys to error toasts", () => {
    expect(describeFeedback([["error", "delete_confirmation"]])).toMatchObject({ tone: "error" });
    expect(describeFeedback([["review", "denied"]])).toMatchObject({ tone: "error" });
    expect(describeFeedback([["result", "partial"]])).toMatchObject({ tone: "error" });
  });

  it("falls back to an honest error line for unknown failure values and null for none", () => {
    expect(describeFeedback([["error", "mystery_value"]])).toMatchObject({ tone: "error" });
    expect(describeFeedback([["error", "unknown"]])).toMatchObject({ tone: "error" });
    expect(describeFeedback([["page", "2"]])).toBeNull();
  });
});
