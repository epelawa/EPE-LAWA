import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Fetches a public web page for the AI desk (news reports, a business website,
 * OpenStreetMap). Every hop is checked: https/http only, standard ports, no
 * credentials, and the host must resolve to a public address, so a submitted
 * business website can never make the server read an internal service.
 */

const MAX_REDIRECTS = 4;

function privateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const [a, b] = address.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  if (family === 6) {
    const value = address.toLowerCase();
    if (value === "::" || value === "::1") return true;
    if (value.startsWith("::ffff:")) return privateAddress(value.slice(7));
    return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(value) || value.startsWith("64:ff9b:") || value.startsWith("2001:db8");
  }
  return true;
}

export async function publicUrl(raw: string): Promise<URL | null> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
  if (url.port && !["80", "443"].includes(url.port)) return null;
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host.includes(".") || /(^|\.)(localhost|local|internal|lan|test|invalid|example)$/.test(host)) return null;
  if (isIP(host)) return privateAddress(host) ? null : url;
  try {
    const addresses = await lookup(host, { all: true, verbatim: true });
    if (!addresses.length || addresses.some((entry) => privateAddress(entry.address))) return null;
  } catch {
    return null;
  }
  return url;
}

export type FetchedText = { url: string; status: number; contentType: string; text: string };
export type FetchedBytes = { url: string; status: number; contentType: string; bytes: Buffer; truncated: boolean };

type FetchOptions = { timeoutMs?: number; maxBytes?: number; accept?: string; allowHosts?: (host: string) => boolean };

/** Same checks as fetchPublicText, but returns the raw bytes (used for news cover images). */
export async function fetchPublicBytes(raw: string, options: FetchOptions = {}): Promise<FetchedBytes | null> {
  const { timeoutMs = 8000, maxBytes = 1_500_000, accept = "*/*", allowHosts } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let current = raw;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const url = await publicUrl(current);
      if (!url || (allowHosts && !allowHosts(url.hostname.toLowerCase()))) return null;
      const response = await fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        cache: "no-store",
        headers: {
          accept,
          "user-agent": "Mozilla/5.0 (compatible; EPE-LAWA-NewsDesk/1.0; +https://epelawa.vercel.app/about)",
          "accept-language": "en-NG,en;q=0.9",
        },
      });
      if (response.status >= 300 && response.status < 400) {
        const next = response.headers.get("location");
        if (!next) return null;
        current = new URL(next, url).toString();
        continue;
      }
      const contentType = response.headers.get("content-type") ?? "";
      const reader = response.body?.getReader();
      if (!reader) return { url: url.toString(), status: response.status, contentType, bytes: Buffer.alloc(0), truncated: false };
      const chunks: Uint8Array[] = [];
      let size = 0;
      let truncated = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) {
          truncated = true;
          await reader.cancel();
          break;
        }
        chunks.push(value);
      }
      return { url: url.toString(), status: response.status, contentType, bytes: Buffer.concat(chunks), truncated };
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchPublicText(raw: string, options: FetchOptions = {}): Promise<FetchedText | null> {
  const { accept = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.5", maxBytes = 1_500_000 } = options;
  const fetched = await fetchPublicBytes(raw, { ...options, accept, maxBytes });
  if (!fetched) return null;
  return { url: fetched.url, status: fetched.status, contentType: fetched.contentType, text: new TextDecoder("utf-8", { fatal: false }).decode(fetched.bytes) };
}
