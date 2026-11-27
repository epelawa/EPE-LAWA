"use client";

import { useCallback, useEffect, type RefObject } from "react";

/**
 * Remembers where the admin menu overlay was (turn 24, "stress free"): the
 * scroll position of its list and the item last tapped. Reopening the menu
 * puts the list back exactly there and makes sure the last tapped item (or
 * the current page) is in view, instead of starting from the top every time.
 * Kept in sessionStorage, so it lasts for the browser tab only.
 */
export function useDrawerMemory(open: boolean, body: RefObject<HTMLElement | null>, storageKey: string) {
  const scrollKey = `${storageKey}:scroll`;
  const lastKey = `${storageKey}:last`;

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const list = body.current;
      if (!list) return;
      let saved = 0;
      let last: string | null = null;
      try {
        saved = Number(sessionStorage.getItem(scrollKey)) || 0;
        last = sessionStorage.getItem(lastKey);
      } catch { /* storage blocked: start at the top */ }
      list.scrollTop = saved;
      const links = Array.from(list.querySelectorAll<HTMLElement>("a[data-nav-href]"));
      const target = (last ? links.find((link) => link.dataset.navHref === last) : undefined)
        ?? list.querySelector<HTMLElement>('a[aria-current="page"]');
      if (!target) return;
      const box = list.getBoundingClientRect();
      const item = target.getBoundingClientRect();
      // Only move when the item is hidden, so the remembered position wins whenever it already shows the item.
      if (item.top < box.top || item.bottom > box.bottom) list.scrollTop += item.top - box.top - (box.height - item.height) / 2;
    });
    return () => cancelAnimationFrame(frame);
  }, [open, body, scrollKey, lastKey]);

  const onScroll = useCallback(() => {
    try { sessionStorage.setItem(scrollKey, String(Math.round(body.current?.scrollTop ?? 0))); } catch { /* storage blocked */ }
  }, [body, scrollKey]);

  const remember = useCallback((href: string) => {
    try {
      sessionStorage.setItem(lastKey, href);
      sessionStorage.setItem(scrollKey, String(Math.round(body.current?.scrollTop ?? 0)));
    } catch { /* storage blocked */ }
  }, [body, lastKey, scrollKey]);

  return { onScroll, remember };
}
