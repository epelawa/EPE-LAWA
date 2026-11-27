import { describe, expect, it } from "vitest";
import { parseProposedPlan, planNeedsConfirm, describeStep, bodyDocument, documentText, type PlanStep } from "../apps/admin/lib/ai-chat-plan";
import { articleIdRange, articleIdsIn, shortArticleId, ticketRefsIn } from "../apps/main/lib/article-ref";
import { epeScopedQuery, insideEpeDivision } from "../apps/main/lib/epe-area";

const article = (n: number) => ({ id: `0000000${n}-0000-4000-8000-000000000000`, title: `Story ${n}` });
const ticket = { id: "t1", reference: "EPE-AB12CD", subject: "Login" };

describe("admin AI chat confirmation rule (owner, turn 26)", () => {
  it("asks for Confirm before any delete, even of one article", () => {
    expect(planNeedsConfirm([{ type: "delete_articles", articles: [article(1)] }])).toBe(true);
  });
  it("runs up to 3 non-delete items straight away", () => {
    const steps: PlanStep[] = [
      { type: "unpublish_articles", articles: [article(1), article(2)] },
      { type: "set_ticket_status", ticket, status: "resolved" },
    ];
    expect(planNeedsConfirm(steps)).toBe(false);
  });
  it("asks for Confirm when more than 3 items are touched", () => {
    expect(planNeedsConfirm([{ type: "unpublish_articles", articles: [article(1), article(2), article(3), article(4)] }])).toBe(true);
  });
  it("edits and replies run immediately", () => {
    expect(planNeedsConfirm([{ type: "edit_article", article: article(1), title: "New", summary: null, body: null }, { type: "reply_ticket", ticket, body: "Fixed", status: null }])).toBe(false);
  });
});

describe("parseProposedPlan", () => {
  it("keeps valid actions and drops unknown or malformed ones", () => {
    const plan = parseProposedPlan({
      reply: "Done",
      actions: [
        { type: "delete_articles", ids: ["1A2B3C4D", "not-an-id"], all: false },
        { type: "publish_article", id: "1a2b3c4d" },
        { type: "reply_ticket", ticket: "epe-ab12cd", body: "Hello", status: "resolved" },
        { type: "set_ticket_status", ticket: "EPE-AB12CD", status: "deleted" },
        { type: "edit_article", id: "1a2b3c4d" },
      ],
    });
    expect(plan?.actions).toEqual([
      { type: "delete_articles", ids: ["1a2b3c4d"], all: false, state: "any" },
      { type: "reply_ticket", ticket: "EPE-AB12CD", body: "Hello", status: "resolved" },
    ]);
  });
  it("never accepts a publish action", () => {
    expect(parseProposedPlan({ reply: "ok", actions: [{ type: "publish_articles", all: true }] })?.actions).toEqual([]);
  });
  it("describes deletes with the article IDs", () => {
    expect(describeStep({ type: "delete_articles", articles: [article(1)] })).toContain("00000001");
  });
});

describe("article IDs and ticket numbers", () => {
  it("finds short and full IDs and ticket numbers", () => {
    expect(articleIdsIn("Edit article 1A2B3C4D")).toEqual(["1a2b3c4d"]);
    expect(ticketRefsIn("reply to epe-ab12cd")).toEqual(["EPE-AB12CD"]);
    expect(shortArticleId("0f1e2d3c-1111-2222-3333-444455556666")).toBe("0F1E2D3C");
  });
  it("turns a short ID into the UUID range it covers", () => {
    expect(articleIdRange("ID 1a2b3c4d")).toEqual({ from: "1a2b3c4d-0000-0000-0000-000000000000", to: "1a2b3c4d-ffff-ffff-ffff-ffffffffffff", exact: false });
    expect(articleIdRange("hello world")).toBeNull();
  });
  it("round-trips article text through the editor document format", () => {
    expect(documentText(bodyDocument("First.\n\nSecond."))).toBe("First.\n\nSecond.");
  });
});

describe("Epe Division map scope", () => {
  it("knows what is inside Epe Division", () => {
    expect(insideEpeDivision(6.5841, 3.9834)).toBe(true); // Epe town
    expect(insideEpeDivision(6.4698, 3.9)).toBe(true); // Ibeju-Lekki coast
    expect(insideEpeDivision(6.5244, 3.3792)).toBe(false); // Lagos mainland
    expect(insideEpeDivision(9.0765, 7.3986)).toBe(false); // Abuja
  });
  it("scopes map searches to Epe Division", () => {
    expect(epeScopedQuery("pharmacy")).toBe("pharmacy, Epe Division, Lagos State, Nigeria");
    expect(epeScopedQuery("Eredo market")).toBe("Eredo market, Lagos State, Nigeria");
  });
});
