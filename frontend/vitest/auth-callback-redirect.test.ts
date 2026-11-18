import { expect, it, vi } from "vitest";
vi.mock("../apps/main/lib/supabase", () => ({ createClient: async () => ({ auth: { exchangeCodeForSession: async () => ({ error: null }) } }) }));
import { GET } from "../apps/main/app/auth/callback/route";

it("keeps the callback redirect local after a successful synthetic code exchange", async () => {
  const url = new URL("https://site.example/auth/callback?code=synthetic&next=%2F%09%2Fevil.example");
  const response = await GET({ url: url.href, nextUrl: url } as never);
  expect(response.headers.get("location")).toBe("https://site.example/dashboard");
});
it("preserves a safe requested location after a successful synthetic exchange", async () => {
  const url = new URL("https://site.example/auth/callback?code=synthetic&next=%2Fnews%2Farticle%3Fref%3Dhome");
  const response = await GET({ url: url.href, nextUrl: url } as never);
  expect(response.headers.get("location")).toBe("https://site.example/news/article?ref=home");
});
