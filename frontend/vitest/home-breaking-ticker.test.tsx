// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect,it,vi } from "vitest";
vi.mock("next/link",()=>({default:({children,href,...rest}:{children:React.ReactNode;href:string;tabIndex?:number})=><a href={href} {...rest}>{children}</a>}));
import { HomeBreakingTicker } from "../apps/main/components/home-breaking-ticker";
(globalThis as { IS_REACT_ACT_ENVIRONMENT?:boolean }).IS_REACT_ACT_ENVIRONMENT=true;
it("renders active headlines, pauses and removes them when they expire",async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date("2026-11-18T00:00:00Z"));const el=document.createElement("div");document.body.append(el);const root=createRoot(el);
 await act(async()=>root.render(<HomeBreakingTicker initialTime={Date.now()} stories={[{slug:"first",title:"First headline",published_at:null,breaking_until:"2026-11-18T00:00:01Z"},{slug:"second",title:"Second headline",published_at:null,breaking_until:"2026-11-18T00:00:03Z"}]} />));
 expect(el.querySelector('a[href="/news/first"]')).not.toBeNull();expect(el.querySelector('a[href="/news/second"]')).not.toBeNull();
 await act(async()=>el.querySelector("button")!.click());expect(el.querySelector("button")?.getAttribute("aria-label")).toContain("Resume");
 await act(async()=>vi.advanceTimersByTime(1100));expect(el.querySelector('a[href="/news/first"]')).toBeNull();expect(el.querySelector('a[href="/news/second"]')).not.toBeNull();
 await act(async()=>vi.advanceTimersByTime(2200));expect(el.querySelector('section')).toBeNull();await act(async()=>root.unmount());el.remove();vi.useRealTimers();
});
