import { describe, expect, it, vi } from "vitest";
import { isGateExempt, maintenanceHtml, maintenanceState, resetMaintenanceStateCache } from "../apps/main/lib/maintenance";
// Load Next's server runtime once at module scope. Under a full suite the cold
// import costs several seconds and must not be charged to the test timeout;
// the request behaviour asserted below is unchanged.
const { NextRequest } = await import("../apps/main/node_modules/next/server.js");
const { proxy } = await import("../apps/main/proxy");
const env = {MAINTENANCE_GATE_ENABLED:"true",NEXT_PUBLIC_SUPABASE_URL:"https://example.supabase.co",NEXT_PUBLIC_SUPABASE_ANON_KEY:"public-key"};
describe("maintenance gate",()=>{
 it("exempts admin and only the assets needed by the maintenance page",()=>{
  for (const path of ["/admin","/admin/login","/admin/settings","/_next/static/a.js","/brand-logo.webp"]) expect(isGateExempt(path)).toBe(true);
  for (const path of ["/administer","/news","/api/radio/guts","/maintenance/refresh.webp","/_next/data/x.json"]) expect(isGateExempt(path)).toBe(false);
 });
 it("reads fresh state and fails closed on invalid results or errors",async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(new Response("true")).mockResolvedValueOnce(new Response("false")).mockResolvedValueOnce(new Response("null")).mockRejectedValueOnce(new Error("network"));
  expect(await maintenanceState(env,fetcher)).toBe("on");expect(await maintenanceState(env,fetcher)).toBe("off");expect(await maintenanceState(env,fetcher)).toBe("unavailable");expect(await maintenanceState(env,fetcher)).toBe("unavailable");
  expect(fetcher.mock.calls[0][1]).toMatchObject({cache:"no-store",method:"POST"});
  expect(await maintenanceState({...env,MAINTENANCE_GATE_ENABLED:"false"},fetcher)).toBe("off");
 });
 it("treats an unset gate flag as enabled and caches global-fetch results briefly",async()=>{
  resetMaintenanceStateCache();
  const globalFetch = vi.fn().mockResolvedValue(new Response("true"));
  vi.stubGlobal("fetch", globalFetch);
  try {
   const withoutFlag = {...env}; delete withoutFlag.MAINTENANCE_GATE_ENABLED;
   expect(await maintenanceState(withoutFlag)).toBe("on");
   expect(await maintenanceState(withoutFlag)).toBe("on");
   expect(globalFetch).toHaveBeenCalledTimes(1);
   resetMaintenanceStateCache();
   vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("false")));
   expect(await maintenanceState(withoutFlag)).toBe("off");
  } finally { vi.unstubAllGlobals(); resetMaintenanceStateCache(); }
 });
 it("varies the inline SVG illustration without raster images or revealing staff access",()=>{
  const pages=[0,1,2,3,4,5,6,7].map(maintenanceHtml);
  expect(new Set(pages.map(p=>p.match(/<svg class="art-svg" viewBox="0 0 240 240" role="img" aria-label="[^"]+"/)?.[0])).size).toBe(4);
  for(const page of pages){
   expect(page).toContain('name="robots"');
   expect(page).not.toMatch(/staff|admin/i);
   expect(page).not.toMatch(/\/maintenance\/[\w-]+\.webp/);
   expect(page).toContain("class=\"art-svg\"");
  }
 });
});

describe("request enforcement",()=>{
 it("returns 503 for pages and APIs even with bypass-looking headers, but preserves admin",async()=>{
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
