import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), client: vi.fn(), revalidate: vi.fn() }));
vi.mock("../apps/admin/lib/supabase", () => ({ createClient: mocks.client }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { addInlineAuthor } from "../apps/admin/lib/inline-author-actions";
beforeEach(() => { vi.clearAllMocks(); mocks.client.mockResolvedValue({rpc:mocks.rpc}); });
it("creates the named author via the audited existing RPC",async()=>{
 mocks.rpc.mockResolvedValue({data:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",error:null});
 expect(await addInlineAuthor("  Ẹni Ọlá  ")).toEqual({id:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",name:"Ẹni Ọlá"});
 expect(mocks.rpc).toHaveBeenCalledWith("newsroom_byline_save",expect.objectContaining({p_id:null,p_display_name:"Ẹni Ọlá",p_bio:null,p_photo_key:null,p_slug:expect.stringMatching(/^eni-ola-[0-9a-f]{12}$/)}));
});
it("rejects invalid input and surfaces authorization failure",async()=>{
 expect(await addInlineAuthor("   ")).toHaveProperty("error");expect(await addInlineAuthor("a".repeat(121))).toHaveProperty("error");expect(mocks.client).not.toHaveBeenCalled();
 mocks.rpc.mockResolvedValue({data:null,error:{code:"42501"}});expect(await addInlineAuthor("Author")).toHaveProperty("error");
});
