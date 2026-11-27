// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { generateKeyPairSync, createVerify } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/link", () => ({ default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; tabIndex?: number }) => <a href={href} {...rest}>{children}</a> }));
import { dayPart, hourLabel12h, range12h, to12h } from "../apps/main/lib/clock12";
import { tickerStamp } from "../apps/main/lib/ticker-time";
import { clockFace } from "../apps/main/components/lagos-live-clock";
import { BreakingTicker, tickerDuration } from "../apps/main/components/breaking-ticker";
import { fcmConfig, fcmMessage, normalisePrivateKey, serviceAccountAssertion } from "../apps/main/lib/fcm-send";
import { anyLive, liveBadges, type QueueCounts } from "../apps/admin/components/use-live-queue-counts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("twelve-hour clock", () => {
  it("turns wall-clock values into am/pm", () => {
    expect(to12h("18:47")).toBe("6:47 pm");
    expect(to12h("18:47:56", true)).toBe("6:47:56 pm");
    expect(to12h("00:05:00")).toBe("12:05 am");
    expect(to12h("12:00")).toBe("12:00 pm");
    expect(to12h("09:30:00")).toBe("9:30 am");
    expect(to12h("not a time")).toBe("not a time");
    expect(range12h("08:00\u201317:00")).toBe("8:00 am \u2013 5:00 pm");
    expect(hourLabel12h(0)).toBe("12 am");
    expect(hourLabel12h(13)).toBe("1 pm");
    expect(hourLabel12h(24)).toBe("12 am");
  });

  it("stamps the breaking ticker in WAT on the 12-hour clock", () => {
    expect(tickerStamp("2026-11-26T17:47:56Z")).toBe("26 Nov · 6:47 pm");
    expect(tickerStamp("2026-11-25T23:30:00Z")).toBe("26 Nov · 12:30 am");
    expect(tickerStamp(null)).toBeNull();
  });

  it("names the part of the day and builds the live clock face", () => {
    expect([4, 5, 11, 12, 16, 17, 20, 21].map(dayPart)).toEqual(["night", "morning", "morning", "afternoon", "afternoon", "evening", "evening", "night"]);
    const face = clockFace(Date.parse("2026-11-26T17:47:56Z"));
    expect(face).toMatchObject({ part: "evening", greeting: "Good evening", time: "6:47", seconds: "56", meridiem: "pm", date: "Thursday, 26 November 2026" });
    expect(clockFace(Date.parse("2026-11-26T07:05:09Z"))).toMatchObject({ part: "morning", greeting: "Good morning", time: "8:05", seconds: "09", meridiem: "am" });
  });
});

describe("breaking news ticker", () => {
  it("scrolls several stories with a count and a speed that grows with the list", async () => {
    const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
    const stories = [1, 2, 3].map((n) => ({ slug: `story-${n}`, title: `Synthetic story ${n}`, published_at: "2026-11-26T17:47:56Z", breaking_until: "2026-11-27T00:00:00Z" }));
    try {
      await act(async () => root.render(<BreakingTicker stories={stories} />));
      expect(host.querySelector("section")?.getAttribute("data-count")).toBe("3");
      expect(host.textContent).toContain("Breaking");
      expect(host.querySelectorAll('ul:not([aria-hidden]) a')).toHaveLength(3);
      expect(host.querySelectorAll('ul[aria-hidden="true"] a[tabindex="-1"]')).toHaveLength(3);
      expect(host.textContent).toContain("6:47 pm");
      expect((host.querySelector("[style]") as HTMLElement).style.getPropertyValue("--ticker-duration")).toBe("27s");
      expect(tickerDuration(1)).toBe(18);
      await act(async () => root.render(<BreakingTicker stories={[]} />));
      expect(host.querySelector("section")).toBeNull();
    } finally { await act(async () => root.unmount()); host.remove(); }
  });
});

describe("Firebase Cloud Messaging sender", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

  it("stays dormant until the three server variables are valid", () => {
    expect(fcmConfig({})).toBeNull();
    expect(fcmConfig({ FIREBASE_PROJECT_ID: "epe-lawa-123", FIREBASE_CLIENT_EMAIL: "bot@epe-lawa-123.iam.gserviceaccount.com", FIREBASE_PRIVATE_KEY: "nope" })).toBeNull();
    const escaped = JSON.stringify(pem).slice(1, -1);
    const config = fcmConfig({ FIREBASE_PROJECT_ID: "epe-lawa-123", FIREBASE_CLIENT_EMAIL: "bot@epe-lawa-123.iam.gserviceaccount.com", FIREBASE_PRIVATE_KEY: escaped });
    expect(config?.privateKey).toBe(pem);
    expect(normalisePrivateKey(`"${escaped}"`)).toBe(pem);
  });

  it("signs a verifiable service-account assertion for Google OAuth", () => {
    const jwt = serviceAccountAssertion({ projectId: "epe-lawa-123", clientEmail: "bot@epe-lawa-123.iam.gserviceaccount.com", privateKey: pem }, Date.parse("2026-11-26T00:00:00Z"));
    const [header, claims, signature] = jwt.split(".");
    expect(JSON.parse(Buffer.from(header, "base64url").toString())).toEqual({ alg: "RS256", typ: "JWT" });
    expect(JSON.parse(Buffer.from(claims, "base64url").toString())).toMatchObject({ iss: "bot@epe-lawa-123.iam.gserviceaccount.com", aud: "https://oauth2.googleapis.com/token", scope: "https://www.googleapis.com/auth/firebase.messaging" });
    const verifier = createVerify("RSA-SHA256"); verifier.update(`${header}.${claims}`);
    expect(verifier.verify(publicKey, Buffer.from(signature, "base64url"))).toBe(true);
  });

  it("builds the v1 message with the cover image and an absolute click link", () => {
    const message = fcmMessage("token-1", { title: "T", body: "B", kind: "news", url: "/news/a-story", image: "/news/a-story/cover", tag: "epelawa:news:a-story" }, "https://epelawa.vercel.app");
    expect(message.message.notification).toEqual({ title: "T", body: "B", image: "https://epelawa.vercel.app/news/a-story/cover" });
    expect(message.message.data).toEqual({ kind: "news", url: "/news/a-story", image: "/news/a-story/cover", tag: "epelawa:news:a-story" });
    expect(message.message.webpush.fcm_options.link).toBe("https://epelawa.vercel.app/news/a-story");
  });
});

describe("admin live dots", () => {
  const counts: QueueCounts = { submissions: 0, corrections: null, articleCorrections: 2, enquiries: 3, events: 0, appeals: 0, forumReports: 0, commentReports: 0, aiEscalations: 1, aiRunning: 1, storageRunning: 0 };
  it("maps live counts and running jobs to navigation items", () => {
    expect(liveBadges(counts, "/enquiries")).toEqual([{ kind: "count", value: 3, label: "3 new messages waiting", key: "enquiries" }]);
    expect(liveBadges(counts, "/ai-processes").map((badge) => badge.kind)).toEqual(["running", "count"]);
    expect(liveBadges(counts, "/storage")).toEqual([]);
    expect(liveBadges(null, "/enquiries")).toEqual([]);
    expect(anyLive(counts)).toBe(true);
    expect(anyLive({ ...counts, articleCorrections: 0, enquiries: 0, aiEscalations: 0, aiRunning: 0 })).toBe(false);
  });
});

describe("AI news push payload", () => {
  it("sends every published story with its same-origin cover and a per-story tag", async () => {
    const { newsPushPayload } = await import("../apps/main/lib/ai/jobs/news");
    expect(newsPushPayload({ title: "Flood closes Epe road", summary: "The road is shut." }, "flood-closes-epe-road", { breaking: true, cover: true })).toEqual({
      title: "Breaking: Flood closes Epe road", body: "The road is shut.", kind: "news", url: "/news/flood-closes-epe-road",
      tag: "epelawa:news:flood-closes-epe-road", image: "/news/flood-closes-epe-road/cover",
    });
    const plain = newsPushPayload({ title: "x".repeat(130), summary: "y".repeat(200) }, "s", { breaking: false, cover: false });
    expect(plain.title).toHaveLength(120);
    expect(plain.body).toHaveLength(180);
    expect(plain).not.toHaveProperty("image");
  });
});
