// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
vi.mock("../apps/main/app/business-directory/submit/actions", () => ({ submitBusiness: vi.fn() }));
vi.mock("../apps/admin/lib/actions", () => ({ createArticle: vi.fn() }));
vi.mock("../apps/admin/lib/inline-author-actions", () => ({ addInlineAuthor: vi.fn() }));
vi.mock("next/link", () => ({ default: ({ children, href }: {children: React.ReactNode; href:string}) => <a href={href}>{children}</a> }));
import BusinessForm from "../apps/main/app/business-directory/submit/business-form";
import NewsArticleComposer from "../apps/admin/components/news-article-composer";
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
function setValue(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const proto = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(element, value);
  element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
}
function button(el: HTMLElement, text: string) { return Array.from(el.querySelectorAll("button")).find(b => b.textContent?.includes(text))!; }
it("business form validates each step and retains fields when navigating back", async () => {
 const el=document.createElement("div"); document.body.append(el); const root=createRoot(el);
 await act(async()=>root.render(<BusinessForm categories={[{id:"food",label:"Food"}]} />));
 const first=el.querySelector<HTMLElement>('[data-step="1"]')!, second=el.querySelector<HTMLElement>('[data-step="2"]')!;
 expect(first.hidden).toBe(false); expect(second.hidden).toBe(true);
 await act(async()=>button(el,"Continue").click()); expect(second.hidden).toBe(true);
 await act(async()=>{setValue(el.querySelector('[name="name"]')!, "Epe Shop");setValue(el.querySelector('[name="category_id"]')!, "food");button(el,"Continue").click();});
 expect(first.hidden).toBe(true); expect(second.hidden).toBe(false); expect(el.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('100');
 await act(async()=>button(el,"Back").click()); expect(first.hidden).toBe(false); expect((el.querySelector('[name="name"]') as HTMLInputElement).value).toBe('Epe Shop');
 await act(async()=>root.unmount());el.remove();
});
it("article composer starts with the story and retains it across validated steps", async () => {
 const el=document.createElement("div");document.body.append(el);const root=createRoot(el);
 await act(async()=>root.render(<NewsArticleComposer categories={[{id:"news",label:"News"}]} authors={[{id:"author",display_name:"Author"}]} />));
 const section=(n:number)=>el.querySelector<HTMLElement>(`[data-composer-step="${n}"]`)!;
 expect(section(1).hidden).toBe(false);expect(section(2).hidden).toBe(true);expect(section(3).hidden).toBe(true);
 await act(async()=>button(el,"Continue").click());expect(section(1).hidden).toBe(false);
 await act(async()=>{setValue(el.querySelector('#title')!, 'A real title');setValue(el.querySelector('#body')!, 'The story text');button(el,"Continue").click();});
 expect(section(2).hidden).toBe(false);expect((el.querySelector('#body') as HTMLTextAreaElement).value).toBe('The story text');
 await act(async()=>button(el,"Continue").click());expect(section(3).hidden).toBe(false);expect(el.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('100');
 await act(async()=>button(el,"Back").click());expect(section(2).hidden).toBe(false);
 await act(async()=>root.unmount());el.remove();
});

import ProgressiveEditor from "../apps/admin/components/progressive-editor";
it("article editing validates steps and preserves revision and fields while navigating", async () => {
 const el=document.createElement("div");document.body.append(el);const root=createRoot(el);const save=vi.fn();
 await act(async()=>root.render(<ProgressiveEditor action={save} articleId="article-id" revision="7" submitLabel="Save private draft" intent="save" steps={[
  {title:"Story",content:<label>Headline<input name="title" required defaultValue="" /></label>},
  {title:"Settings",content:<label>Category<input name="categoryId" required defaultValue="news" /></label>},
  {title:"Cover",content:<label>Alt<input name="alt" defaultValue="" /></label>},
 ]}/>));
 const section=(n:number)=>el.querySelector<HTMLElement>(`[data-editor-step="${n}"]`)!;
 expect(section(0).hidden).toBe(false);expect(section(1).hidden).toBe(true);
 await act(async()=>button(el,"Continue").click());expect(section(0).hidden).toBe(false);
 await act(async()=>{setValue(el.querySelector('[name="title"]')!,"Headline");button(el,"Continue").click();});expect(section(1).hidden).toBe(false);
 await act(async()=>button(el,"Continue").click());expect(section(2).hidden).toBe(false);
 expect(el.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('100');
 expect(new FormData(el.querySelector('form')!).get('revision')).toBe('7');
 await act(async()=>button(el,"Back").click());await act(async()=>button(el,"Back").click());expect((el.querySelector('[name="title"]') as HTMLInputElement).value).toBe('Headline');
 expect(save).not.toHaveBeenCalled();await act(async()=>root.unmount());el.remove();
});
it("business form retains entered details after a server error", async () => {
 const { submitBusiness } = await import("../apps/main/app/business-directory/submit/actions");
 vi.mocked(submitBusiness).mockResolvedValueOnce({status:"error",message:"Could not save"});
 const el=document.createElement("div");document.body.append(el);const root=createRoot(el);
 await act(async()=>root.render(<BusinessForm categories={[{id:"food",label:"Food"}]} />));
 await act(async()=>{setValue(el.querySelector('[name="name"]')!,"Epe Shop");setValue(el.querySelector('[name="category_id"]')!,"food");button(el,"Continue").click();});
 await act(async()=>{setValue(el.querySelector('[name="phone"]')!,"+234 800 123 4567");});
 await act(async()=>{el.querySelector("form")!.requestSubmit();});
 expect(el.querySelector('[role="alert"]')?.textContent).toContain("Could not save");
 expect((el.querySelector('[name="name"]') as HTMLInputElement).value).toBe("Epe Shop");
 expect((el.querySelector('[name="phone"]') as HTMLInputElement).value).toBe("+234 800 123 4567");
 await act(async()=>root.unmount());el.remove();
});
