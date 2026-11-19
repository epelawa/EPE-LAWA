// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
vi.mock("../apps/main/app/enquiry/actions",()=>({submitEnquiry:vi.fn()}));
import FloatingSupport from "../apps/main/components/floating-support";
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
it("links to support and moves by keyboard, preserving its position",async()=>{
 localStorage.clear(); const el=document.createElement("div"); document.body.append(el); const root=createRoot(el);
 await act(async()=>root.render(<FloatingSupport/>));
 expect(el.querySelector("dialog a")?.getAttribute("href")).toBe("/support");
 expect(el.querySelector("dialog")?.getAttribute("aria-labelledby")).toBe("support-dialog-title");
 expect(el.textContent).toContain("temporarily unavailable");
 const handle=el.querySelector("button")!; expect(handle.getAttribute("aria-label")).toContain("arrow keys");
 await act(async()=>handle.dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowRight",bubbles:true})));
 expect(JSON.parse(localStorage.getItem("epelawa-support-position")!).x).toBe(20);
 await act(async()=>root.unmount());el.remove();localStorage.clear();
});
