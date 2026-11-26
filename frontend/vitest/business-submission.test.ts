import { beforeEach, describe, expect, it, vi } from "vitest";
// Turn 4 owner brief: business submissions accept guests as well as members, pass the human
// check and the per-network limiter, and are inserted server-side with status "submitted".
// The mail behaviour asserted here (staff first, then the submitter, never the listing details,
// success kept after a mail failure) is unchanged from the member-only version of this test.
const m = vi.hoisted(() => ({ insert: vi.fn(), category: vi.fn(), audit: vi.fn(), who: vi.fn(), config: vi.fn(), mail: vi.fn(), revalidate: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
vi.mock("../apps/main/node_modules/next/cache.js", () => ({ revalidatePath: m.revalidate }));
vi.mock("../apps/main/lib/auth-mail-hook", () => ({ authMailConfig: m.config, deliverAuthMessage: m.mail }));
vi.mock("../apps/main/lib/human-check", () => ({ verifyHumanCheck: async () => "pass", humanCheckFailedMessage: "human check failed" }));
vi.mock("../apps/main/lib/public-submitter", () => ({ resolvePublicSubmitter: m.who, slugifyTitle: () => "example-business-abc123" }));
vi.mock("../apps/main/lib/media-r2", () => ({ storeLogoDataUrl: vi.fn() }));
vi.mock("../apps/main/lib/form-server", () => ({
  formRateAllowance: async () => true,
  formRateMessage: async () => "limited",
  formAdminClient: () => ({
    from: (table: string) => table === "business_categories"
      ? { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: m.category }) }) }) }
      : { insert: (row: unknown) => { m.insert(row); return { select: () => ({ single: async () => m.insert.mock.results.at(-1)?.value ?? { data: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }, error: null } }) }; } },
    rpc: m.audit,
  }),
}));
import { submitBusiness } from "../apps/main/app/business-directory/submit/actions";
const data = () => { const f = new FormData(); f.set("name", "Example Business"); f.set("category_id", "category"); return f; };
const member = { ok: true, submitter: { userId: "u1", memberId: "u1", name: null, email: "member@example.invalid", guest: false } };
beforeEach(() => {
  vi.resetAllMocks();
  m.who.mockResolvedValue(member);
  m.category.mockResolvedValue({ data: { id: "category" } });
  m.insert.mockReturnValue({ data: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }, error: null });
  m.audit.mockResolvedValue({ data: null, error: null });
  m.config.mockReturnValue({ kind: "gmail", user: "staff@example.invalid" });
  m.mail.mockResolvedValue(undefined);
});
describe("business submission", () => {
  it("notifies staff and acknowledges the submitter only after saving", async () => {
    expect((await submitBusiness({ status: "idle", message: "" }, data())).status).toBe("success");
    expect(m.insert).toHaveBeenCalledOnce();
    expect(m.insert.mock.calls[0][0]).toMatchObject({ status: "submitted", owner_user_id: "u1", submitter_email: null });
    expect(m.mail).toHaveBeenCalledTimes(2);
    expect(m.mail.mock.calls[0][0].to).toBe("staff@example.invalid");
    expect(m.mail.mock.calls[1][0].to).toBe("member@example.invalid");
    expect(JSON.stringify(m.mail.mock.calls[0])).not.toContain("Example Business");
  });
  it("stores guest contact privately on the row and acknowledges the guest", async () => {
    m.who.mockResolvedValue({ ok: true, submitter: { userId: null, memberId: null, name: "Ada Guest", email: "guest@example.invalid", guest: true } });
    expect((await submitBusiness({ status: "idle", message: "" }, data())).status).toBe("success");
    expect(m.insert.mock.calls[0][0]).toMatchObject({ status: "submitted", owner_user_id: null, submitter_name: "Ada Guest", submitter_email: "guest@example.invalid" });
    expect(m.mail.mock.calls[1][0].to).toBe("guest@example.invalid");
  });
  it("does not claim submission or send mail on database failure", async () => {
    m.insert.mockReturnValue({ data: null, error: { code: "XX000" } });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await submitBusiness({ status: "idle", message: "" }, data())).status).toBe("error");
    expect(m.mail).not.toHaveBeenCalled();
    log.mockRestore();
  });
  it("does not ask the user to resubmit after an email failure", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    m.mail.mockRejectedValue(new Error("unavailable"));
    expect((await submitBusiness({ status: "idle", message: "" }, data())).status).toBe("success");
    expect(m.mail).toHaveBeenCalledTimes(2);
    log.mockRestore();
  });
});
