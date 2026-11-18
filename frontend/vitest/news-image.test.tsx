// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import NewsImage from "../apps/main/components/news-image";
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
it("uses the logo for absent and failed covers", () => {
  const container = document.createElement("div"); document.body.append(container); const root = createRoot(container);
  act(() => root.render(<NewsImage className="image" src={null} alt="" />));
  let image = container.querySelector("img")!;
  expect(image.getAttribute("src")).toBe("/brand-logo.png");
  expect(image.dataset.newsFallback).toBe("true");
  act(() => root.render(<NewsImage className="image" src="https://images.example.com/cover.jpg" alt="Photo" />));
  image = container.querySelector("img")!;
  expect(image.getAttribute("src")).toBe("https://images.example.com/cover.jpg");
  act(() => image.dispatchEvent(new Event("error")));
  expect(image.getAttribute("src")).toBe("/brand-logo.png");
  expect(image.getAttribute("alt")).toBe("EPE LAWA logo");
  act(() => root.unmount()); container.remove();
});
