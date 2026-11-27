import { expect, it } from "vitest";
import { GET } from "../apps/main/app/api/radio/guts/route";
import { GUTS_FM } from "../apps/main/lib/guts-radio";

it("serves the broadcaster's public feed through the existing station discovery endpoint", async () => {
  const response = GET();

  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toContain("s-maxage=60");
  expect(await response.json()).toEqual({
    reason: "ready",
    station: {
      name: "Guts FM",
      frequency: "104.9 FM",
      streamUrl: GUTS_FM.streamUrl,
    },
  });
  expect(new URL(GUTS_FM.streamUrl).protocol).toBe("https:");
});
