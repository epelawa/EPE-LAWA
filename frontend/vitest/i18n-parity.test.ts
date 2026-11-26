import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const messages = await readFile(fileURLToPath(new URL("../apps/main/lib/i18n-messages.ts", import.meta.url)), "utf8");
const wrapper = await readFile(fileURLToPath(new URL("../apps/main/lib/i18n.ts", import.meta.url)), "utf8");

function blockKeys(name: string): string[] {
  const start = messages.indexOf(`const ${name}: Strings`);
  const end = messages.indexOf("const dictionaries");
  const block = messages.slice(start, end);
  return [...block.matchAll(/"([^"]+)":/g)].map((match) => match[1]);
}

describe("i18n dictionaries", () => {
  it("keeps the cookie name stable", () => {
    expect(messages).toContain('SITE_LANG_COOKIE = "ep_lang"');
  });

  it("has every English key mirrored in Yoruba", () => {
    const yoKeys = new Set(blockKeys("yo"));
    const missing = blockKeys("en").filter((key) => !yoKeys.has(key));
    expect(missing).toEqual([]);
  });

  it("never leaks a raw dictionary key", () => {
    expect(messages).toMatch(/export function tt\(/);
    expect(messages).toMatch(/return value \?\? fallback/);
  });

  // Turn 4 owner brief: Yoruba is now complete enough to switch on, so the server wrapper reads
  // the ep_lang cookie and still falls back to English for anything but an explicit "yo".
  it("server wrapper reads the language cookie and defaults to English", () => {
    expect(wrapper).toMatch(/export async function readSiteLanguage\(\)/);
    expect(wrapper).toMatch(/cookies\(/);
    expect(wrapper).toMatch(/SITE_LANG_COOKIE/);
    expect(wrapper).toMatch(/"en"/);
  });
});
