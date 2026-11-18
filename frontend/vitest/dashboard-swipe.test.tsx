// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { swipeDestination } from "../apps/main/lib/dashboard-swipe";
const push=vi.fn();
vi.mock("next/navigation",()=>({useRouter:()=>({push})}));
import DashboardSwipe from "../apps/main/components/dashboard-swipe";
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT=true;
describe("dashboard swipe",()=>{
 it("requires a deliberate mostly horizontal gesture and stops at the ends",()=>{
  expect(swipeDestination("home",-100,10)).toBe("discover");
  expect(swipeDestination("discover",100,10)).toBe("home");
  expect(swipeDestination("home",100,0)).toBeNull();
  expect(swipeDestination("profile",-100,0)).toBeNull();
  expect(swipeDestination("home",-79,0)).toBeNull();
  expect(swipeDestination("home",-100,80)).toBeNull();
 });
 it("navigates from content but not inputs, vertical gestures or edge gestures",async()=>{
  push.mockClear(); const el=document.createElement("div");document.body.append(el);const root=createRoot(el);
  await act(async()=>root.render(<DashboardSwipe active="discover"><a href="/story">Story</a><input aria-label="Search" /></DashboardSwipe>));
  const gesture=(target:Element,x:number,y:number,dx:number,dy:number)=>{
    const a=new Event("touchstart",{bubbles:true});Object.defineProperty(a,"touches",{value:[{clientX:x,clientY:y}]});target.dispatchEvent(a);
    const b=new Event("touchend",{bubbles:true});Object.defineProperty(b,"changedTouches",{value:[{clientX:x+dx,clientY:y+dy}]});target.dispatchEvent(b);
  };
  await act(async()=>gesture(el.querySelector("a")!,150,100,-100,3));expect(push).toHaveBeenCalledWith("/dashboard?tab=notifications",{scroll:false});
  push.mockClear();await act(async()=>{gesture(el.querySelector("input")!,150,100,-100,0);gesture(el.querySelector("a")!,150,100,-100,100);gesture(el.querySelector("a")!,10,100,100,0);});expect(push).not.toHaveBeenCalled();
  act(()=>root.unmount());el.remove();
 });
});
