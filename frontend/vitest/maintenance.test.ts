import { describe, expect, it, vi } from "vitest";
import { isGateExempt, maintenanceHtml, maintenanceState } from "../apps/main/lib/maintenance";
const env = {MAINTENANCE_GATE_ENABLED:"true",NEXT_PUBLIC_SUPABASE_URL:"https://example.supabase.co",NEXT_PUBLIC_SUPABASE_ANON_KEY:"public-key"};
describe("maintenance gate",()=>{
 it("exempts admin and only the assets needed by the maintenance page",()=>{
  for (const path of ["/admin","/admin/login","/admin/settings","/_next/static/a.js","/brand-logo.png","/maintenance/gears.png"]) expect(isGateExempt(path)).toBe(true);
  for (const path of ["/administer","/news","/api/radio/guts","/maintenance/other.png","/_next/data/x.json"]) expect(isGateExempt(path)).toBe(false);
 });
 it("reads fresh state and fails closed on invalid results or errors",async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(new Response("true")).mockResolvedValueOnce(new Response("false")).mockResolvedValueOnce(new Response("null")).mockRejectedValueOnce(new Error("network"));
  expect(await maintenanceState(env,fetcher)).toBe("on");expect(await maintenanceState(env,fetcher)).toBe("off");expect(await maintenanceState(env,fetcher)).toBe("unavailable");expect(await maintenanceState(env,fetcher)).toBe("unavailable");
  expect(fetcher.mock.calls[0][1]).toMatchObject({cache:"no-store",method:"POST"});
  expect(await maintenanceState({...env,MAINTENANCE_GATE_ENABLED:"false"},fetcher)).toBe("off");
 });
 it("varies the illustration without revealing staff access",()=>{
  const pages=[0,1,2,3].map(maintenanceHtml);expect(new Set(pages.map(p=>p.match(/\/maintenance\/\w+\.png/)?.[0])).size).toBe(4);
  for(const page of pages){expect(page).toContain('name="robots"');expect(page).not.toMatch(/staff|admin/i);}
 });
});

describe("request enforcement",()=>{
 it("returns 503 for pages and APIs even with bypass-looking headers, but preserves admin",async()=>{
  const { NextRequest } = await import("../apps/main/node_modules/next/server.js"); const { proxy } = await import("../apps/main/proxy");
  vi.stubEnv("MAINTENANCE_GATE_ENABLED","true"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL",env.NEXT_PUBLIC_SUPABASE_URL);vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY",env.NEXT_PUBLIC_SUPABASE_ANON_KEY);vi.stubEnv("SUPABASE_ANON_KEY","public-key");
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response("true")));
  try {
   const page=await proxy(new NextRequest("https://example.test/news",{headers:{"x-middleware-subrequest":"middleware:middleware:middleware:middleware:middleware","cookie":"maintenance_bypass=true"}}));
   expect(page.status).toBe(503);expect(await page.text()).toContain("We’ll be back soon");expect(page.headers.get("cache-control")).toContain("no-store");
   expect((await proxy(new NextRequest("https://example.test/api/test",{method:"POST"}))).status).toBe(503);
   expect((await proxy(new NextRequest("https://example.test/admin/login"))).status).toBe(200);
  } finally {vi.unstubAllGlobals();vi.unstubAllEnvs();}
 });
});
