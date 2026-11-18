import { describe, expect, it } from "vitest";
import { notificationSoundId, NOTIFICATION_SOUND_EVENT } from "../apps/main/lib/notification-sound";
describe("notification sound event contract", () => {
  it("accepts only bounded opaque IDs for the expected event", () => {
    expect(notificationSoundId({ type: NOTIFICATION_SOUND_EVENT, id: "push_abc-123" })).toBe("push_abc-123");
    for (const input of [null, {}, { type: "push", id: "abc" }, { type: NOTIFICATION_SOUND_EVENT, id: "../x" }, { type: NOTIFICATION_SOUND_EVENT, id: "x".repeat(129) }]) expect(notificationSoundId(input)).toBeNull();
  });
});
