"use client";
import { useRef, type ReactNode, type TouchEvent } from "react";
import { useRouter } from "next/navigation";
import { swipeDestination, type DashboardTab } from "../lib/dashboard-swipe";

function interactiveOrScrollable(target: EventTarget | null, boundary: HTMLElement): boolean {
  if (!(target instanceof Element)) return true;
  if (target.closest("input,textarea,select,button,[contenteditable='true'],[role='slider'],[data-no-dashboard-swipe]")) return true;
  let element: Element | null = target;
  while (element && element !== boundary) {
    if (element instanceof HTMLElement && element.scrollWidth > element.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(element).overflowX)) return true;
    element = element.parentElement;
  }
  return false;
}
export default function DashboardSwipe({ active, children }: { active: DashboardTab; children: ReactNode }) {
  const router = useRouter();
  const start = useRef<{x:number;y:number;time:number} | null>(null);
  function begin(e: TouchEvent<HTMLDivElement>) {
    start.current = null;
    if (e.touches.length !== 1 || interactiveOrScrollable(e.target, e.currentTarget)) return;
    const touch=e.touches[0];
    // Leave the browser's edge-navigation gesture alone.
    if (touch.clientX < 24 || touch.clientX > window.innerWidth - 24) return;
    start.current={x:touch.clientX,y:touch.clientY,time:Date.now()};
  }
  function end(e: TouchEvent<HTMLDivElement>) {
    const initial=start.current; start.current=null;
    if (!initial || e.changedTouches.length !== 1 || Date.now()-initial.time > 1000) return;
    const touch=e.changedTouches[0];
    const next=swipeDestination(active,touch.clientX-initial.x,touch.clientY-initial.y);
    if (next) router.push(`/dashboard?tab=${next}`, { scroll: false });
  }
  return <div onTouchStart={begin} onTouchEnd={end} onTouchCancel={() => { start.current=null; }}>{children}</div>;
}
