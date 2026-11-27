import { describe, expect, it } from "vitest";
import { firstName, personalGreeting, stripModelGreeting, withGreeting } from "../apps/main/lib/ai/greeting";
import { validateNewTicket, validateTicketReply, categoryLabel } from "../apps/main/lib/support/rules";
import { mustEscalate, validateSupportDecision, MAX_AI_REPLIES_PER_TICKET } from "../apps/main/lib/support/ai-rules";
import { describeJobSchedule, jobDue, normaliseJobSchedules } from "../apps/main/lib/ai/job-schedule";
import { imageSize, logoShaped, looksLikeLogoUrl, sameImage, sanitiseImagePrompt, sanitiseImageQuery } from "../apps/main/lib/ai/news-image-rules";
import { storyPlainText } from "../apps/main/lib/ai/jobs/news-reedit-rules";

describe("personal email greetings (turn 25)", () => {
  it("uses the first name, tidied, and falls back to 'there'", () => {
    expect(firstName("tolu ADEBAYO")).toBe("Tolu");
    expect(firstName("McKenzie Okafor")).toBe("McKenzie");
    expect(firstName("someone@example.com")).toBe("there");
    expect(firstName("")).toBe("there");
    expect(firstName(null)).toBe("there");
  });
  it("is stable for the same message and varies across messages", () => {
    const now = Date.parse("2026-11-27T09:00:00Z");
    expect(personalGreeting("Tolu", "msg-1", now)).toBe(personalGreeting("Tolu", "msg-1", now));
    const seen = new Set(Array.from({ length: 40 }, (_, index) => personalGreeting("Tolu", `msg-${index}`, now)));
    expect(seen.size).toBeGreaterThan(3);
    for (const greeting of seen) expect(greeting).toContain("Tolu");
  });
  it("never opens twice when the model already greeted", () => {
    expect(stripModelGreeting("Hello Tolu,\nThanks for writing.")).toBe("Thanks for writing.");
    const mail = withGreeting("Tolu", "x", "Hi there!\nYour listing is live.");
    expect(mail.match(/Tolu/g)?.length).toBe(1);
    expect(mail.endsWith("Your listing is live.")).toBe(true);
  });
});

describe("support ticket rules", () => {
  it("validates the public form", () => {
    const good = validateNewTicket({ name: "Ada Obi", email: "ADA@example.com", category: "account", subject: "Cannot sign in", message: "The code never arrives in my inbox." });
    expect(good.ok && good.value.email).toBe("ada@example.com");
    expect(validateNewTicket({ name: "A", email: "a@b.co", category: "account", subject: "Hi there", message: "long enough text" }).ok).toBe(false);
    expect(validateNewTicket({ name: "Ada", email: "nope", category: "account", subject: "Hi there", message: "long enough text" }).ok).toBe(false);
    expect(validateNewTicket({ name: "Ada", email: "a@b.co", category: "bogus", subject: "Hi there", message: "long enough text" }).ok).toBe(false);
    expect(validateTicketReply(" ok ").ok).toBe(true);
    expect(validateTicketReply("x").ok).toBe(false);
    expect(categoryLabel("privacy")).toBe("Privacy or my data");
  });
  it("the AI hands sensitive, urgent or repeated tickets to a person", () => {
    const reply = validateSupportDecision({ action: "reply", category: "technical", priority: "normal", summary: "Page will not load", reason: "Known fix", reply: "Please clear your browser cache and try again; that fixes this for most readers." });
    expect(reply).not.toBeNull();
    expect(mustEscalate(reply!, { aiReplies: 0, text: "page will not load" })).toBeNull();
    expect(mustEscalate(reply!, { aiReplies: MAX_AI_REPLIES_PER_TICKET, text: "" })).toMatch(/person/);
    expect(mustEscalate({ ...reply!, category: "privacy" }, { aiReplies: 0, text: "" })).toMatch(/staff/);
    expect(mustEscalate({ ...reply!, priority: "urgent" }, { aiReplies: 0, text: "" })).toMatch(/staff/);
    expect(mustEscalate(reply!, { aiReplies: 0, text: "I want a refund now" })).toMatch(/staff/);
    expect(validateSupportDecision({ action: "reply", summary: "short", reason: "x", reply: "too short" })).toBeNull();
    expect(validateSupportDecision({ action: "maybe" })).toBeNull();
  });
});

describe("per-job AI schedules", () => {
  const now = Date.parse("2026-11-27T12:00:00Z");
  it("normalises bad input to the defaults", () => {
    const schedules = normaliseJobSchedules({ moderation: { mode: "interval", minutes: 2 }, ads: { mode: "times", times: [] }, support: "junk" });
    expect(schedules.moderation).toEqual({ mode: "interval", minutes: 5, times: [] });
    expect(schedules.ads.mode).toBe("interval");
    expect(schedules.support.mode).toBe("pass");
  });
  it("decides when each job is due", () => {
    expect(jobDue({ mode: "off", minutes: 5, times: [] }, null, now)).toBe(false);
    expect(jobDue({ mode: "pass", minutes: 5, times: [] }, new Date(now).toISOString(), now)).toBe(true);
    const hourly = { mode: "interval" as const, minutes: 60, times: [] };
    expect(jobDue(hourly, null, now)).toBe(true);
    expect(jobDue(hourly, new Date(now - 30 * 60_000).toISOString(), now)).toBe(false);
    expect(jobDue(hourly, new Date(now - 59 * 60_000).toISOString(), now)).toBe(true);
    expect(describeJobSchedule({ mode: "times", minutes: 5, times: ["08:00"] }, () => "8:00 am")).toBe("Daily at 8:00 am (Lagos)");
  });
});

describe("AI cover rules: never an outlet's logo", () => {
  it("spots logos, icons and default share cards", () => {
    expect(looksLikeLogoUrl("https://www.vanguardngr.com/wp-content/uploads/logo.png")).toBe(true);
    expect(looksLikeLogoUrl("https://example.com/assets/og-default.jpg")).toBe(true);
    expect(looksLikeLogoUrl("https://example.com/favicon.ico")).toBe(true);
    expect(looksLikeLogoUrl("https://example.com/uploads/2026/11/photo-150x150.jpg")).toBe(true);
    expect(looksLikeLogoUrl("https://example.com/uploads/2026/11/flood-in-epe.jpg")).toBe(false);
    expect(sameImage("https://www.a.com/x/pic-1024x768.jpg?v=2", "http://a.com/x/pic.jpg")).toBe(true);
  });
  it("reads picture sizes and rejects logo shapes", () => {
    const png = new Uint8Array(24);
    png.set([0x89, 0x50, 0x4e, 0x47]);
    png.set([0, 0, 4, 0], 16);
    png.set([0, 0, 2, 0x58], 20);
    expect(imageSize(png)).toEqual({ width: 1024, height: 600 });
    expect(logoShaped({ width: 1024, height: 600 })).toBe(false);
    expect(logoShaped({ width: 600, height: 600 })).toBe(true);
    expect(logoShaped({ width: 1200, height: 200 })).toBe(true);
  });
  it("keeps searches and prompts plain and brand-free", () => {
    expect(sanitiseImageQuery('"Epe" market -site:x.com flood waters rising today again')).toBe("Epe market -site x com flood");
    expect(sanitiseImagePrompt("Flooded road in Epe")).toMatch(/no logos/);
    expect(sanitiseImagePrompt("x")).toBe("");
  });
});

describe("re-editing earlier AI stories", () => {
  it("reads the story text without the AI footer or old sources list", () => {
    const body = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Traffic eased on the Epe road." }] },
        { type: "paragraph", content: [{ type: "text", text: "Officials said work ends Friday." }] },
        { type: "heading", content: [{ type: "text", text: "Sources" }] },
        { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Vanguard" }] }] }] },
        { type: "paragraph", content: [{ type: "text", text: "Written by the EPE LAWA AI desk from public reports." }] },
      ],
    };
    expect(storyPlainText(body)).toBe("Traffic eased on the Epe road.\nOfficials said work ends Friday.");
    expect(storyPlainText(null)).toBe("");
  });
});
