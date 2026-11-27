export type CampaignSource = { key: string; label: string };

const SOURCES: Record<string, CampaignSource> = {
  google: { key: "google", label: "Google" },
  google_search: { key: "google", label: "Google" },
  google_ads: { key: "google", label: "Google" },
  googleadwords: { key: "google", label: "Google" },
  bing: { key: "bing", label: "Bing" },
  bing_search: { key: "bing", label: "Bing" },
  microsoft: { key: "bing", label: "Bing" },
  msn: { key: "bing", label: "Bing" },
  yahoo: { key: "yahoo", label: "Yahoo" },
  duckduckgo: { key: "duckduckgo", label: "DuckDuckGo" },
  ddg: { key: "duckduckgo", label: "DuckDuckGo" },
  brave: { key: "brave", label: "Brave Search" },
  ecosia: { key: "ecosia", label: "Ecosia" },
  yandex: { key: "yandex", label: "Yandex" },
  facebook: { key: "facebook", label: "Facebook" },
  meta: { key: "facebook", label: "Facebook" },
  instagram: { key: "instagram", label: "Instagram" },
  whatsapp: { key: "whatsapp", label: "WhatsApp" },
  youtube: { key: "youtube", label: "YouTube" },
  tiktok: { key: "tiktok", label: "TikTok" },
  linkedin: { key: "linkedin", label: "LinkedIn" },
  twitter: { key: "x", label: "X" },
  x: { key: "x", label: "X" },
  reddit: { key: "reddit", label: "Reddit" },
  firefox: { key: "firefox", label: "Firefox" },
  mozilla: { key: "mozilla", label: "Mozilla" },
  email: { key: "email", label: "Email" },
  newsletter: { key: "newsletter", label: "Newsletter" },
};

function sourceKey(raw: string | null): string {
  return (raw ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function recognizedCampaignSource(raw: string | null): CampaignSource | null {
  return SOURCES[sourceKey(raw)] ?? null;
}

/** Canonicalize standard UTM values and translate the legacy `next-utmfrom` typo. */
export function normalizeCampaignAttribution(params: URLSearchParams): boolean {
  let changed = false;
  const limits: Record<string, number> = {
    utm_source: 80,
    utm_medium: 80,
    utm_campaign: 120,
    utm_term: 120,
    utm_content: 120,
  };

  for (const [name, maxLength] of Object.entries(limits)) {
    const raw = params.get(name);
    if (raw === null) continue;
    const value = raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
    if (value !== raw) changed = true;
    if (value) params.set(name, value);
    else params.delete(name);
  }

  const legacy = params.get("next-utmfrom") ?? params.get("utmfrom");
  const currentSource = params.get("utm_source");
  const source = recognizedCampaignSource(currentSource) ?? (!currentSource ? recognizedCampaignSource(legacy) : null);
  if (source && currentSource !== source.key) {
    params.set("utm_source", source.key);
    changed = true;
  }
  for (const key of ["next-utmfrom", "utmfrom"]) {
    if (params.has(key)) {
      params.delete(key);
      changed = true;
    }
  }
  return changed;
}

/** Never reflect provider-controlled errMessage text; map known conditions to safe copy. */
export function authErrorToastMessage(params: URLSearchParams): string | null {
  if (!params.has("errMessage")) return null;
  const error = (params.get("errMessage") ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").slice(0, 300).toLowerCase();
  const source = recognizedCampaignSource(params.get("from")) ?? recognizedCampaignSource(params.get("utm_source")) ?? recognizedCampaignSource(params.get("next-utmfrom"));
  const platform = source?.label;
  const signInLabel = platform ? `${platform} sign-in` : "sign-in";

  if (/session.{0,60}(expired|timed\s*out)|(?:expired|timed\s*out).{0,60}session/.test(error)) {
    return `Your ${signInLabel} session for EPE LAWA has expired. Please sign in again.`;
  }
  return `We couldn’t complete ${signInLabel} to EPE LAWA. Please try again.`;
}
