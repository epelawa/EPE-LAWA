import { describe, expect, it } from "vitest";
import { dynamic, GET } from "../apps/main/app/api/health/route";

describe("GET /api/health", () => {
  it("returns exactly the documented liveness fields", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(dynamic).toBe("force-dynamic");

    const body = await response.json();
    expect(Object.keys(body).sort()).toEqual(["status", "timestamp", "uptimeSeconds"]);
    expect(body.status).toBe("ok");
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
    expect(typeof body.uptimeSeconds).toBe("number");
    expect(Number.isFinite(body.uptimeSeconds)).toBe(true);
    expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it("never reflects environment values, secrets or framework internals", async () => {
    const sentinel = "EPE_HEALTH_SENTINEL_DO_NOT_LEAK_9f3a";
    const previous = process.env.EPE_HEALTH_TEST_SENTINEL;
    process.env.EPE_HEALTH_TEST_SENTINEL = sentinel;
    try {
      const raw = await (await GET()).text();
      expect(raw).not.toContain(sentinel);
      for (const needle of ["next.js", "x-powered-by", "supabase", "database_url", "process.env", "node_modules", "stack", "git", "vercel"]) {
        expect(raw.toLowerCase()).not.toContain(needle);
      }
      expect(raw).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}/);
    } finally {
      if (previous === undefined) delete process.env.EPE_HEALTH_TEST_SENTINEL;
      else process.env.EPE_HEALTH_TEST_SENTINEL = previous;
    }
  });
});
