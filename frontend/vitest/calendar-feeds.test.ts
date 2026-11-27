import { expect, it, vi } from "vitest";
import { buildIcs } from "../apps/main/app/radio/programmes/ics";
import { GET as radioCalendar } from "../apps/main/app/api/radio/schedule.ics/route";
import { GET as eventsCalendar } from "../apps/main/app/api/events/calendar.ics/route";
import { GET as eventCalendar } from "../apps/main/app/api/events/[slug]/ics/route";
import { createClient } from "../apps/main/lib/supabase";

vi.mock("../apps/main/lib/supabase", () => ({ createClient: vi.fn() }));

it("exports weekly WAT slots with full UTC dates and folds Unicode text by bytes", () => {
  const programme = "Ìtàn Ìlú Mi, Àṣà; ".repeat(7);
  const result = buildIcs([{
    id: "slot", day_of_week: 4, starts_at: "13:30:00", ends_at: "14:45:00",
    programme, note: "Line one\rLine two",
  }], new Date("2026-11-26T13:00:00Z"));
  expect(result).toContain("DTSTART:20261203T123000Z\r\nDTEND:20261203T134500Z\r\nRRULE:FREQ=WEEKLY");
  expect(result.replaceAll("\r\n ", "")).toContain(`SUMMARY:${programme.replaceAll(",", "\\,").replaceAll(";", "\\;")}`);
  expect(result).toContain("DESCRIPTION:Line one\\nLine two\r\n");
  expect(result.split("\r\n").every((line) => Buffer.byteLength(line) <= 75)).toBe(true);
});

const failure = { data: null, error: { message: "fixture database unavailable" } };

it("reports database outages as uncacheable errors for all calendar feeds", async () => {
  const query = {
    select: () => query, eq: () => query, gte: () => query, order: () => query,
    limit: async () => failure, maybeSingle: async () => failure,
  };
  vi.mocked(createClient).mockResolvedValue({ from: () => query } as unknown as Awaited<ReturnType<typeof createClient>>);
  const responses = await Promise.all([
    radioCalendar(), eventsCalendar(),
    eventCalendar(new Request("http://localhost"), { params: Promise.resolve({ slug: "fixture-event" }) }),
  ]);
  for (const response of responses) {
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
  }
});
