// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
vi.mock("../apps/main/app/news/comment-actions", () => ({ postArticleComment: vi.fn() }));
import CommentDock from "../apps/main/components/comment-dock";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
it("closes the comment dialog before following the read-comments link", () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(<CommentDock articleId="test" slug="test" count={0} signedIn={false} signInHref="/login" />));
  const dialog = container.querySelector("dialog")!;
  dialog.showModal = function () { this.setAttribute("open", ""); };
  dialog.close = function () { this.removeAttribute("open"); };
  act(() => container.querySelector<HTMLButtonElement>(".comment-fab")!.click());
  expect(dialog.open).toBe(true);
  const link = dialog.querySelector<HTMLAnchorElement>('a[href="#comments"]')!;
  act(() => link.click());
  expect(dialog.open).toBe(false);
  act(() => root.unmount());
  container.remove();
});
it("does not claim to be first when the count is unavailable", () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(<CommentDock articleId="test" slug="test" count={null} signedIn={false} signInHref="/login" />));
  const dialog = container.querySelector("dialog")!;
  dialog.showModal = function () { this.setAttribute("open", ""); };
  dialog.close = function () { this.removeAttribute("open"); };
  act(() => container.querySelector<HTMLButtonElement>(".comment-fab")!.click());
  expect(dialog.textContent).toContain("Comment count is currently unavailable.");
  expect(dialog.textContent).not.toContain("Be the first");
  act(() => root.unmount());
  container.remove();
});
