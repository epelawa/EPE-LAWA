import { expect, it } from "vitest";
import { businessInitials, directionsHref, directoryHref, parseDirectoryQuery, safeWebsite, searchTerm, telHref, whatsappHref } from "../apps/main/lib/business-directory";

it("formats WhatsApp links internationally and refuses numbers that would be dead links", () => {
  expect(whatsappHref("+234 803 123 4567")).toBe("https://wa.me/2348031234567");
  expect(whatsappHref("08031234567")).toBe("https://wa.me/2348031234567");
  expect(whatsappHref("12345")).toBeNull();
  expect(whatsappHref(null)).toBeNull();
});

it("builds tel: links only for dialable numbers", () => {
  expect(telHref("+234 (803) 123-4567")).toBe("tel:+2348031234567");
  expect(telHref("0803 123 4567")).toBe("tel:08031234567");
  expect(telHref("12")).toBeNull();
});

it("only http(s) websites become buttons", () => {
  expect(safeWebsite("https://foundatech.name.ng")).toBe("https://foundatech.name.ng/");
  expect(safeWebsite("javascript:alert(1)")).toBeNull();
  expect(safeWebsite("foundatech.name.ng")).toBeNull();
});

it("keeps Yorùbá letters in search terms and drops PostgREST grammar and LIKE wildcards", () => {
  expect(searchTerm("Ọjà Ẹ̀pẹ́")).toBe("Ọjà Ẹ̀pẹ́".normalize("NFC"));
  expect(searchTerm("a,b.c:d(e)*f%g_h\"i")).toBe("a b c d e f g h i");
  expect(searchTerm("Tom's & Co-op")).toBe("Tom's & Co-op");
});

it("parses and rebuilds directory URLs without inventing values", () => {
  const q = parseDirectoryQuery({ q: " tech ", category: "Bad Slug!", verified: "1", sort: "popular", page: "3" });
  expect(q).toEqual({ q: "tech", area: "", category: "", verified: true, sort: "verified", page: 3 });
  expect(directoryHref({ ...q, page: 1 })).toBe("/business-directory?q=tech&verified=1");
  expect(directoryHref({})).toBe("/business-directory");
});

it("initials and directions use stored data only", () => {
  expect(businessInitials("Founda Technologies")).toBe("FT");
  expect(businessInitials("  ")).toBe("•");
  expect(directionsHref("12 Main St, Epe", "Online")).toBe("https://www.google.com/maps/search/?api=1&query=12%20Main%20St%2C%20Epe");
  expect(directionsHref(null, null)).toBeNull();
});
