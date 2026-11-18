// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect,it,vi } from "vitest";
vi.mock("../apps/main/app/newsletter/actions",()=>({subscribeNewsletter:vi.fn()}));
import NewsletterActiveForm from "../apps/main/components/newsletter-active-form";
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT=true;
it("uses the subscribe button as an explicit consent action, with a visible notice",async()=>{
 const el=document.createElement("div");document.body.append(el);const root=createRoot(el);
 await act(async()=>root.render(<NewsletterActiveForm id="footer-test" variant="footer"/>));
 const form=el.querySelector("form")!, input=el.querySelector("input[type=email]") as HTMLInputElement, button=el.querySelector("button")!;
 expect(el.querySelector("input[type=checkbox]")).toBeNull();expect(input.getAttribute("aria-describedby")).toBe("footer-test-consent");
 expect(el.querySelector("#footer-test-consent")!.textContent).toContain("agree to receive");
 input.value="reader@example.invalid"; const data=new FormData(form,button);expect(data.get("email")).toBe("reader@example.invalid");expect(data.get("consent")).toBe("yes");
 act(()=>root.unmount());el.remove();
});

it("uses the same consent action on the newsletter page",async()=>{
 const el=document.createElement("div");document.body.append(el);const root=createRoot(el);
 await act(async()=>root.render(<NewsletterActiveForm id="page-test" variant="card"/>));
 const form=el.querySelector("form")!,button=el.querySelector("button")!;
 expect(el.querySelector("input[type=checkbox]")).toBeNull();expect(el.querySelector("#page-test-consent")!.textContent).toContain("agree to receive");
 expect(new FormData(form,button).get("consent")).toBe("yes");
 act(()=>root.unmount());el.remove();
});
