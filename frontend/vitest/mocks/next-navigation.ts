import { useSyncExternalStore } from "react";

let pathname = "/";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot() {
  return pathname;
}

/** Test-only router stand-in. Real Next.js exposes the same reactive contract. */
export function usePathname() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function setTestPathname(next: string) {
  pathname = next;
  for (const listener of listeners) listener();
}

export function resetTestPathname(next = "/") {
  pathname = next;
}
