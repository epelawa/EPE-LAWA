import { describe, expect, it } from "vitest";
import { radioReminderKey } from "../apps/main/lib/radio-reminder";

describe("radio reminder time in Lagos", () => {
  it("matches Thursday 1:30–1:34 pm Lagos time only", () => {
    expect(radioReminderKey(new Date("2026-11-19T12:29:59Z"))).toBeNull();
    expect(radioReminderKey(new Date("2026-11-19T12:30:00Z"))).toBe("2026-11-19");
    expect(radioReminderKey(new Date("2026-11-19T12:34:59Z"))).toBe("2026-11-19");
    expect(radioReminderKey(new Date("2026-11-19T12:35:00Z"))).toBeNull();
    expect(radioReminderKey(new Date("2026-11-20T12:30:00Z"))).toBeNull();
  });
});
