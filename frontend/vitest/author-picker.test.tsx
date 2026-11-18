// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect,it,vi } from "vitest";
const add=vi.hoisted(()=>vi.fn());
vi.mock("../apps/admin/lib/inline-author-actions",()=>({addInlineAuthor:add}));
import AuthorPicker from "../apps/admin/components/author-picker";
(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
it("lets editors add and select a custom byline without submitting the article",async()=>{
 add.mockResolvedValue({id:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",name:"Ada Epe"});
 const el=document.createElement("div");document.body.append(el);const root=createRoot(el); const change=vi.fn();
 await act(async()=>root.render(<form><AuthorPicker authors={[{id:"old",display_name:"Existing"}]} initialId="old" onChange={change}/></form>));
 const input=el.querySelector<HTMLInputElement>("#custom-author-name")!;
 await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(input,"Ada Epe");input.dispatchEvent(new Event("input",{bubbles:true}));});
 expect((el.querySelector("select") as HTMLSelectElement).value).toBe("");
 await act(async()=>el.querySelector("button")!.click());
 expect(add).toHaveBeenCalledWith("Ada Epe");expect((el.querySelector("select") as HTMLSelectElement).value).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");expect(change).toHaveBeenLastCalledWith("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","Ada Epe");
 expect(el.textContent).toContain("Author added and selected");act(()=>root.unmount());el.remove();
});
