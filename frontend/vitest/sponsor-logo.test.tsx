// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import SponsorLogo from "../apps/main/components/sponsor-logo";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(element: React.ReactElement) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(element));
  return { container, unmount: () => { act(() => root.unmount()); container.remove(); } };
}

it("shows the uploaded sponsor logo when there is one", () => {
  const view = mount(<SponsorLogo src="https://media.example.com/logo.webp" className="logo" fallbackClassName="fallback" />);
  const img = view.container.querySelector("img")!;
  expect(img.getAttribute("src")).toBe("https://media.example.com/logo.webp");
  expect(img.dataset.sponsorFallback).toBeUndefined();
  view.unmount();
});

it("uses the EPE LAWA logo when the ad has no logo", () => {
  const view = mount(<SponsorLogo src={null} className="logo" fallbackClassName="fallback" />);
  const img = view.container.querySelector("img")!;
  expect(img.getAttribute("src")).toBe("/brand-logo.webp");
  expect(img.className).toBe("logo fallback");
  expect(img.getAttribute("alt")).toBe("");
  view.unmount();
});

it("swaps a broken logo for the EPE LAWA logo instead of a broken image", () => {
  const view = mount(<SponsorLogo src="https://media.example.com/missing.webp" className="logo" fallbackClassName="fallback" />);
  const img = view.container.querySelector("img")!;
  act(() => { img.dispatchEvent(new Event("error")); });
  expect(view.container.querySelector("img")!.getAttribute("src")).toBe("/brand-logo.webp");
  view.unmount();
});
