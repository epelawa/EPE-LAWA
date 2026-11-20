const illustrations = ["repair", "technician", "gears", "screen"] as const;
export function isGateExempt(path: string): boolean {
  return path === "/admin" || path.startsWith("/admin/") || path.startsWith("/_next/static/") || path === "/brand-logo.png" || illustrations.some(name => path === `/maintenance/${name}.png`);
}
export async function maintenanceState(env: NodeJS.ProcessEnv, fetcher: typeof fetch = fetch): Promise<"on" | "off" | "unavailable"> {
  // Deployment is explicitly opted in only after the database migration is rehearsed.
  if (env.MAINTENANCE_GATE_ENABLED !== "true") return "off";
  try {
    const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    const key = env.SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!key || (url.protocol !== "https:" && !(env.NODE_ENV !== "production" && url.hostname === "localhost")) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return "unavailable";
    const response = await fetcher(new URL("/rest/v1/rpc/maintenance_status", url), {method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:"{}",cache:"no-store",signal:AbortSignal.timeout(4000)});
    if (!response.ok) return "unavailable";
    const data: unknown = await response.json();
    return data === true ? "on" : data === false ? "off" : "unavailable";
  } catch { return "unavailable"; }
}
export function maintenanceHtml(index: number): string {
  const image = illustrations[((index % illustrations.length) + illustrations.length) % illustrations.length];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>We'll be back soon | EPE LAWA</title><style>
*{box-sizing:border-box}body{margin:0;background:#f1f4fa;color:#17264a;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:28px 20px}.card{width:min(960px,100%);display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:20px;padding:clamp(24px,5vw,56px);background:#fff;border:1px solid #dce5f3;border-radius:28px;box-shadow:0 25px 70px #17264a14}.brand{display:flex;align-items:center;gap:12px;font-weight:800;letter-spacing:.05em;color:#17264a}.brand img{width:52px;height:52px;object-fit:contain}.badge{display:inline-block;margin:32px 0 14px;padding:8px 12px;border-radius:999px;background:#eaf1ff;color:#294b91;font-size:.75rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase}h1{font-size:clamp(2.2rem,5vw,3.6rem);line-height:1.08;letter-spacing:-.045em;margin:0 0 18px;color:#0a1023}p{font-size:1.05rem;line-height:1.7;color:#4c607d;max-width:35ch}.thanks{font-size:.92rem;margin-top:26px;color:#294b91;font-weight:650}.art img{display:block;width:100%;max-width:430px;margin:auto;border-radius:24px}footer{margin-top:30px;font-size:.82rem;color:#64738c}@media(max-width:700px){.card{grid-template-columns:1fr;gap:4px}.art{grid-row:2}.art img{max-width:300px}.badge{margin-top:22px}footer{margin-top:18px}}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style></head><body><main><div class="card"><div><div class="brand"><img src="/brand-logo.png" alt=""><span>EPE LAWA</span></div><span class="badge">A little tune-up</span><h1>We’ll be back soon.</h1><p>We’re making improvements to give you a better experience. Please check back a little later.</p><p class="thanks">Thank you for your patience.</p><footer>© EPE LAWA</footer></div><div class="art"><img src="/maintenance/${image}.png" alt="" width="800" height="800"></div></div></main></body></html>`;
}
