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
