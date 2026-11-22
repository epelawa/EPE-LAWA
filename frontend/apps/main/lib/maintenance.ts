const illustrations = ["refresh", "tools", "clock", "shield"] as const;

export type Illustration = (typeof illustrations)[number];

export function isGateExempt(path: string): boolean {
  return path === "/admin" || path.startsWith("/admin/") || path.startsWith("/_next/static/") || path === "/brand-logo.webp";
}
/** Short edge cache so the gate stays near-real-time without an RPC on every request. */
export const MAINTENANCE_CACHE_TTL_MS = 10_000;
let maintenanceCache: { at: number; state: "on" | "off" | "unavailable" } | null = null;
export function resetMaintenanceStateCache(): void {
  maintenanceCache = null;
}

export async function maintenanceState(env: NodeJS.ProcessEnv, fetcher: typeof fetch = fetch): Promise<"on" | "off" | "unavailable"> {
  // Only an explicit "false" opts the deployment out; the owner's settings switch
  // otherwise drives the gate through the reviewed database RPC. A deployment
  // without database variables is simply undriven — the gate stays off.
  if (env.MAINTENANCE_GATE_ENABLED === "false") return "off";
  const cacheUsable = fetcher === fetch;
  if (cacheUsable && maintenanceCache && Date.now() - maintenanceCache.at < MAINTENANCE_CACHE_TTL_MS) return maintenanceCache.state;
  const state = await maintenanceStateUncached(env, fetcher);
  if (cacheUsable) maintenanceCache = { at: Date.now(), state };
  return state;
}

async function maintenanceStateUncached(env: NodeJS.ProcessEnv, fetcher: typeof fetch): Promise<"on" | "off" | "unavailable"> {
  try {
    const rawUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const key = env.SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!rawUrl || !key) return "off";
    const url = new URL(rawUrl);
    if ((url.protocol !== "https:" && !(env.NODE_ENV !== "production" && url.hostname === "localhost")) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return "unavailable";
    const response = await fetcher(new URL("/rest/v1/rpc/maintenance_status", url), {method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:"{}",cache:"no-store",signal:AbortSignal.timeout(4000)});
    if (!response.ok) return "unavailable";
    const data: unknown = await response.json();
    return data === true ? "on" : data === false ? "off" : "unavailable";
  } catch { return "unavailable"; }
}

function maintenanceArt(variant: Illustration): string {
  if (variant === "tools") return `<svg class="art-svg" viewBox="0 0 240 240" role="img" aria-label="Maintenance tools" width="240" height="240"><circle cx="120" cy="120" r="104" fill="#eaf1ff"/><circle cx="120" cy="120" r="104" fill="none" stroke="#a7c5f5" stroke-width="2" stroke-dasharray="3 9" stroke-linecap="round"/><path d="M92 148 58 182M148 92l16-16a6 6 0 0 0 0-8.5l-5-5a6 6 0 0 0-8.5 0l-16 16M92 148a6 6 0 0 0 0 8.5l12 12" fill="none"/><g stroke="#0a1023" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="m94 146-34 34a8.5 8.5 0 0 0 12 12l34-34"/><path d="M146 96a22 22 0 0 0 27 27l21 21a10 10 0 0 1-14 14l-21-21a22 22 0 0 1-27-27l16 9 9-16"/></g><circle cx="120" cy="120" r="104" fill="none"/></svg>`;
  if (variant === "clock") return `<svg class="art-svg" viewBox="0 0 240 240" role="img" aria-label="Scheduled maintenance" width="240" height="240"><circle cx="120" cy="120" r="104" fill="#eaf1ff"/><circle cx="120" cy="120" r="104" fill="none" stroke="#a7c5f5" stroke-width="2" stroke-dasharray="3 9" stroke-linecap="round"/><circle cx="120" cy="124" r="62" fill="#fff" stroke="#0a1023" stroke-width="7"/><path d="M120 96v26l18 14" stroke="#477fe0" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M120 40v18m0 132v18M36 124h18m132 0h-18" stroke="#294b91" stroke-width="7" stroke-linecap="round"/></svg>`;
  if (variant === "shield") return `<svg class="art-svg" viewBox="0 0 240 240" role="img" aria-label="Your data is safe" width="240" height="240"><circle cx="120" cy="120" r="104" fill="#eaf1ff"/><circle cx="120" cy="120" r="104" fill="none" stroke="#a7c5f5" stroke-width="2" stroke-dasharray="3 9" stroke-linecap="round"/><path d="M120 52l52 20v46c0 34-22 58-52 70-30-12-52-36-52-70V72z" fill="#fff" stroke="#0a1023" stroke-width="7" stroke-linejoin="round"/><path d="m102 122 13 13 26-28" stroke="#477fe0" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
  return `<svg class="art-svg" viewBox="0 0 240 240" role="img" aria-label="Improvements in progress" width="240" height="240"><circle cx="120" cy="120" r="104" fill="#eaf1ff"/><circle cx="120" cy="120" r="104" fill="none" stroke="#a7c5f5" stroke-width="2" stroke-dasharray="3 9" stroke-linecap="round"/><g class="art-gear" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M172 96a56 56 0 0 0-96-8m-8 56a56 56 0 0 0 96 8" stroke="#0a1023" stroke-width="7"/><path d="M76 60v28h28M164 180v-28h-28" stroke="#477fe0" stroke-width="7"/></g><g transform="translate(96 96) scale(2)"><path d="M24 6a18 18 0 1 1-12.7 5.3" stroke="#294b91" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M24 2v6h-6" transform="rotate(45 24 12)" stroke="#294b91" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g></svg>`;
}

const ART_HINT: Record<Illustration, string> = {
  refresh: "Improvements in progress.",
  tools: "A quick tune-up is underway.",
  clock: "We'll be back on schedule.",
  shield: "Your data stays safe while we work.",
};

export function maintenanceHtml(index: number): string {
  const variant = illustrations[index % illustrations.length] ?? illustrations[0];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>We'll be back soon | EPE LAWA</title><style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:32px 20px;background:#0a1023;color:#17264a;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.scene{width:min(980px,100%);display:grid;grid-template-columns:1.1fr .9fr;align-items:center;gap:0;background:#f1f4fa;border:1px solid #293650;border-radius:32px;overflow:hidden;box-shadow:0 30px 80px #050a18}
.copy{padding:clamp(28px,5vw,64px)}
.brand{display:flex;align-items:center;gap:12px;font-weight:800;letter-spacing:.05em;color:#0a1023}
.brand img{width:44px;height:44px;object-fit:contain;border-radius:12px;background:#fff;border:1px solid #a6b2c5;padding:5px}
.badge{display:inline-flex;align-items:center;gap:8px;margin:30px 0 16px;padding:8px 14px;border-radius:999px;background:#eaf1ff;color:#294b91;font-size:.74rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
.badge .dot{width:8px;height:8px;border-radius:50%;background:#477fe0;animation:pulse 2.4s ease-in-out infinite}
h1{font-size:clamp(2.1rem,4.6vw,3.4rem);line-height:1.06;letter-spacing:-.045em;margin:0 0 16px;color:#0a1023}
p{font-size:1.03rem;line-height:1.7;color:#4c607d;max-width:36ch;margin:0}
.thanks{margin-top:24px;color:#294b91;font-weight:650}
.hint{margin-top:14px;font-size:.9rem;color:#64738c}
.art{align-self:stretch;display:grid;place-items:center;padding:clamp(24px,4vw,48px);background:linear-gradient(160deg,#17264a 0%,#294b91 58%,#477fe0 130%)}
.art-svg{width:min(320px,72%);height:auto;filter:drop-shadow(0 14px 30px #050a1859)}
.art-gear{transform-origin:182px 78px;animation:spin 14s linear infinite}
footer{margin-top:28px;font-size:.8rem;color:#64738c;letter-spacing:.04em}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:720px){.scene{grid-template-columns:1fr;border-radius:26px}.art{order:-1;padding:28px}.art-svg{width:min(190px,58%)}.copy{padding:26px 22px 30px}}
@media(prefers-reduced-motion:reduce){.art-gear,.badge .dot{animation:none!important}}
</style></head><body><main><div class="scene"><div class="copy"><div class="brand"><img src="/brand-logo.webp" alt=""><span>EPE LAWA</span></div><span class="badge"><span class="dot"></span>Scheduled maintenance</span><h1>We’ll be back soon.</h1><p>We’re making improvements to give you a better experience. Please check back a little later.</p><p class="thanks">Thank you for your patience.</p><p class="hint">${ART_HINT[variant]}</p><footer>&copy; EPE LAWA</footer></div><div class="art" aria-hidden="true">${maintenanceArt(variant)}</div></div></main></body></html>`;
}
