import { renderToStaticMarkup } from "react-dom/server";
import { expect,it } from "vitest";
import ArticleByline from "../apps/main/components/article-byline";
it("shows the actual author with a decorative person icon and an accessible label",()=>{
 const html=renderToStaticMarkup(<ArticleByline name="Ada Epe"/>);
 expect(html).toContain("Ada Epe");expect(html).toContain("Author:");expect(html).toContain("<svg");expect(html).toContain('aria-hidden="true"');
});
