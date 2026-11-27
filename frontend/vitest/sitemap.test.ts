import { afterEach, expect, it, vi } from "vitest";
import sitemap from "../apps/main/app/sitemap";
import { createClient } from "../apps/main/lib/supabase";

vi.mock("../apps/main/lib/supabase", () => ({ createClient: vi.fn() }));
afterEach(() => vi.unstubAllEnvs());

it("uses the most recent published story for the news index last modification", async () => {
  vi.stubEnv("ALLOW_INDEXING", "true");
  const latest = "2026-11-26T10:00:00Z";
  const query = {
    select: () => query, not: () => query, order: () => query,
    limit: async () => ({ data: [
      { slug: "latest", published_at: latest },
      { slug: "older", published_at: "2026-11-12T10:00:00Z" },
    ] }),
  };
  vi.mocked(createClient).mockResolvedValue({ from: () => query } as unknown as Awaited<ReturnType<typeof createClient>>);
  const result = await sitemap();
  expect(result.find(({ url }) => new URL(url).pathname === "/news")?.lastModified).toEqual(new Date(latest));
});
