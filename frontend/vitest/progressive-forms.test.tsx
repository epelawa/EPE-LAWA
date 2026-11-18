// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
vi.mock("../apps/main/app/business-directory/submit/actions", () => ({ submitBusiness: vi.fn() }));
vi.mock("../apps/admin/lib/actions", () => ({ createArticle: vi.fn(), createArticleWithFeedback: vi.fn() }));
vi.mock("../apps/admin/lib/inline-author-actions", () => ({ addInlineAuthor: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
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

it("composer preserves story content when the server cannot save", async () => {
 const {createArticleWithFeedback}=await import("../apps/admin/lib/actions");
 vi.mocked(createArticleWithFeedback).mockResolvedValueOnce({status:"error",message:"Check your access"});
 const el=document.createElement("div");document.body.append(el);const root=createRoot(el);
 await act(async()=>root.render(<NewsArticleComposer categories={[{id:"news",label:"News"}]} authors={[{id:"author",display_name:"Author"}]} />));
 await act(async()=>{setValue(el.querySelector('#title')!,"A headline");setValue(el.querySelector('#body')!,"A story");button(el,"Continue").click();});
 await act(async()=>button(el,"Continue").click());
 await act(async()=>{setValue(el.querySelector('#categoryId')!,"news");setValue(el.querySelector('#authorId')!,"author");});
 await act(async()=>{el.querySelector('form')!.requestSubmit();});
 expect(el.querySelector('[role="alert"]')?.textContent).toContain('Check your access');
 expect((el.querySelector('#title') as HTMLInputElement).value).toBe('A headline');expect((el.querySelector('#body') as HTMLTextAreaElement).value).toBe('A story');
 await act(async()=>root.unmount());el.remove();
});
it("uncertain saves require a deliberate check before retry", async () => {
 const {createArticleWithFeedback}=await import("../apps/admin/lib/actions");
 vi.mocked(createArticleWithFeedback).mockResolvedValueOnce({status:"uncertain",message:"Check the newsroom list"});
 const el=document.createElement("div");document.body.append(el);const root=createRoot(el);
 await act(async()=>root.render(<NewsArticleComposer categories={[{id:"news",label:"News"}]} authors={[{id:"author",display_name:"Author"}]} />));
 await act(async()=>{setValue(el.querySelector('#title')!,"A headline");setValue(el.querySelector('#body')!,"A story");button(el,"Continue").click();});await act(async()=>button(el,"Continue").click());
 await act(async()=>{setValue(el.querySelector('#categoryId')!,"news");setValue(el.querySelector('#authorId')!,"author");el.querySelector('form')!.requestSubmit();});
 expect(button(el,"Save article").disabled).toBe(true);expect(el.querySelector('[role="alert"]')?.textContent).toContain('Check the newsroom list');
 await act(async()=>button(el,"I checked").click());expect(button(el,"Save article").disabled).toBe(false);
 await act(async()=>root.unmount());el.remove();
});

it("article editor preserves fields and revision on conflict", async () => {
 const el=document.createElement("div");document.body.append(el);const root=createRoot(el);
 const feedback=vi.fn().mockResolvedValue({status:"error",message:"This article changed. Copy your work before reloading."});
 await act(async()=>root.render(<ProgressiveEditor action={vi.fn()} feedbackAction={feedback} articleId="item" revision="7" submitLabel="Save private draft" steps={[{title:"Story",content:<label>Headline<input name="title" defaultValue="Old" /></label>}]} />));
 await act(async()=>{setValue(el.querySelector('[name="title"]')!,"Changed");el.querySelector('form')!.requestSubmit();});
 expect(el.querySelector('[role="alert"]')?.textContent).toContain('article changed');expect((el.querySelector('[name="title"]') as HTMLInputElement).value).toBe('Changed');
 expect(feedback.mock.calls[0][0].get('revision')).toBe('7');await act(async()=>root.unmount());el.remove();
});
it("browser recovery restores controlled article body and author after refresh", async () => {
 vi.useFakeTimers();sessionStorage.clear();const el=document.createElement("div");document.body.append(el);let root=createRoot(el);
 const composer=<NewsArticleComposer recoveryActor="member-1" categories={[{id:"news",label:"News"}]} authors={[{id:"author",display_name:"Author"}]} />;
 await act(async()=>root.render(composer));await act(async()=>button(el,"Enable browser recovery").click());
 await act(async()=>{setValue(el.querySelector('#title')!,"Recovered title");setValue(el.querySelector('#body')!,"Recovered body");button(el,"Continue").click();});
 await act(async()=>button(el,"Continue").click());await act(async()=>{setValue(el.querySelector('#categoryId')!,"news");setValue(el.querySelector('#authorId')!,"author");vi.advanceTimersByTime(600);});
 await act(async()=>root.unmount());root=createRoot(el);await act(async()=>root.render(composer));
 await act(async()=>button(el,"Restore recovery copy").click());
 expect((el.querySelector('#title') as HTMLInputElement).value).toBe("Recovered title");expect((el.querySelector('#body') as HTMLTextAreaElement).value).toBe("Recovered body");expect((el.querySelector('#authorId') as HTMLSelectElement).value).toBe("author");
 await act(async()=>root.unmount());el.remove();sessionStorage.clear();vi.useRealTimers();
});
it("article preview shows the branded fallback when no cover is selected", async () => {
 const original=HTMLDialogElement.prototype.showModal;HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
 const el=document.createElement('div');document.body.append(el);const root=createRoot(el);
 try {
  await act(async()=>root.render(<NewsArticleComposer categories={[{id:'news',label:'News'}]} authors={[{id:'author',display_name:'Author'}]} />));
  await act(async()=>button(el,'Preview article').click());
  const dialog=el.querySelector('dialog')!;expect(dialog.querySelector('img')?.getAttribute('src')).toBe('/brand-logo.png');expect(dialog.textContent).toContain('No cover selected');
 } finally {await act(async()=>root.unmount());el.remove();HTMLDialogElement.prototype.showModal=original;}
});
