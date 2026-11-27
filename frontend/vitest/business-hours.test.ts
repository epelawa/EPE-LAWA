import { describe, expect, it } from "vitest";
import { businessOpenNow as publicOpenNow } from "../apps/main/lib/business-hours";
import { businessOpenNow as staffOpenNow } from "../apps/admin/lib/business-hours";

describe.each([["public", publicOpenNow], ["staff", staffOpenNow]] as const)("%s business hours", (_, openNow) => {
  it("carries a Saturday overnight shift into Sunday and closes at its end", () => {
    const hours = { saturday: "22:00–02:00" };
    expect(openNow(hours, new Date("2026-11-28T00:00:00Z"))).toBe(false);
    expect(openNow(hours, new Date("2026-11-28T21:00:00Z"))).toBe(true);
    expect(openNow(hours, new Date("2026-11-29T00:30:00Z"))).toBe(true);
    expect(openNow(hours, new Date("2026-11-29T01:00:00Z"))).toBe(false);
  });
});
