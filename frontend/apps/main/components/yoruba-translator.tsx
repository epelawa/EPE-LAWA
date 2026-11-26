"use client";

import { useEffect } from "react";

/**
 * Full-interface Yoruba. When the visitor picks Yorùbá, this loads the UI
 * dictionary (code-split; English visitors never download it) and translates
 * every interface text node and accessible attribute on the page, including
 * content rendered later (dialogs, toasts, form errors, client navigation).
 *
 * Only exact interface strings are replaced, so user content (articles, forum
 * posts, business names, people) stays as written. Mark any region that must
 * never be translated with translate="no" or data-no-translate.
 *
 * It runs after hydration, so React never sees a server/client mismatch; when
 * React later rewrites a node, the observer translates it again.
 */
const ATTRS = ["placeholder", "aria-label", "title", "aria-description", "data-tooltip"] as const;
const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE", "svg", "SVG"]);
const TRAIL = /([\s:.,!?…→↗»]+)$/;
const LEAD = /^([\s←«]+)/;

function norm(s: string) { return s.replace(/\s+/g, " ").trim(); }

export default function YorubaTranslator({ lang }: { lang: "en" | "yo" }) {
  useEffect(() => {
    const root = document.documentElement;
    if (lang !== "yo") { root.removeAttribute("data-yo-ready"); return; }
    let cancelled = false;
    let observer: MutationObserver | null = null;
    let sweepTimer = 0;

    void import("../lib/yo").then(({ YO }) => {
      if (cancelled) return;
      const lookup = (raw: string): string | null => {
        const text = norm(raw);
        if (!text || !/[A-Za-z]/.test(text)) return null;
        const hit = YO[text];
        if (hit) return hit;
        // Retry without leading/trailing punctuation or arrows, then restore them.
        const lead = text.match(LEAD)?.[1] ?? "";
        const trail = text.match(TRAIL)?.[1] ?? "";
        const core = text.slice(lead.length, text.length - trail.length);
        if (core && core !== text && YO[core]) return lead + YO[core] + trail;
        return null;
      };
      const blocked = (el: Element | null) => !!el?.closest('[translate="no"],[data-no-translate],[contenteditable="true"]');
      // Streamed sections hydrate after this effect runs. Editing a node React has not hydrated
      // yet causes a hydration mismatch, so only touch elements React already owns (it tags them
      // with a __reactFiber$ key) and sweep again shortly for the rest.
      let deferred = false;
      const hydrated = (el: Element) => {
        for (const k in el) if (k.startsWith("__reactFiber$")) return true;
        deferred = true;
        return false;
      };

      const translateText = (node: Text) => {
        const parent = node.parentElement;
        if (!parent || SKIP.has(parent.tagName) || blocked(parent) || !hydrated(parent)) return;
        const value = node.nodeValue ?? "";
        const out = lookup(value);
        if (out === null) return;
        const lead = value.match(/^\s*/)?.[0] ?? "";
        const tail = value.match(/\s*$/)?.[0] ?? "";
        const next = lead + out + tail;
        if (next !== value) node.nodeValue = next;
      };
      const translateAttrs = (el: Element) => {
        if (blocked(el) || !hydrated(el)) return;
        for (const name of ATTRS) {
          const value = el.getAttribute(name);
          if (!value) continue;
          const out = lookup(value);
          if (out !== null && out !== value) el.setAttribute(name, out);
        }
        if (el instanceof HTMLInputElement && (el.type === "submit" || el.type === "button") && el.value) {
          const out = lookup(el.value);
          if (out !== null && out !== el.value) el.value = out;
        }
        if (el instanceof HTMLImageElement && el.alt && el.closest("header,footer,nav,[data-ui-image]")) {
          const out = lookup(el.alt);
          if (out !== null && out !== el.alt) el.alt = out;
        }
      };
      const walk = (start: Node) => {
        if (start.nodeType === Node.TEXT_NODE) { translateText(start as Text); return; }
        if (start.nodeType !== Node.ELEMENT_NODE) return;
        const el = start as Element;
        if (SKIP.has(el.tagName)) return;
        translateAttrs(el);
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
          acceptNode: (n) => (n.nodeType === Node.ELEMENT_NODE && SKIP.has((n as Element).tagName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
        });
        let n = walker.nextNode();
        while (n) {
          if (n.nodeType === Node.TEXT_NODE) translateText(n as Text);
          else translateAttrs(n as Element);
          n = walker.nextNode();
        }
      };

      walk(document.body);
      let sweeps = 0;
      const sweep = () => {
        if (cancelled || !deferred || sweeps++ > 40) return;
        deferred = false;
        walk(document.body);
        sweepTimer = window.setTimeout(sweep, 250);
      };
      sweepTimer = window.setTimeout(sweep, 250);
      const title = lookup(document.title.replace(/ \| EPE LAWA$/, ""));
      if (title) document.title = `${title} | EPE LAWA`;
      root.setAttribute("data-yo-ready", "true");

      observer = new MutationObserver((records) => {
        for (const r of records) {
          if (r.type === "characterData") translateText(r.target as Text);
          else if (r.type === "attributes") translateAttrs(r.target as Element);
          else r.addedNodes.forEach(walk);
        }
      });
      observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS, "value", "alt"] });
    }).catch(() => root.setAttribute("data-yo-ready", "true"));

    return () => { cancelled = true; observer?.disconnect(); window.clearTimeout(sweepTimer); };
  }, [lang]);
  return null;
}
