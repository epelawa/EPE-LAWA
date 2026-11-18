import { beforeEach, describe, expect, it, vi } from "vitest";
const m=vi.hoisted(()=>({rpc:vi.fn(), user:vi.fn(), config:vi.fn(), mail:vi.fn(), revalidate:vi.fn()}));
vi.mock("next/navigation",()=>({redirect:(url:string)=>{throw new Error(`REDIRECT:${url}`)}}));
vi.mock("../apps/main/node_modules/next/cache.js",()=>({revalidatePath:m.revalidate}));
vi.mock("../apps/main/lib/supabase",()=>({createClient:async()=>({auth:{getUser:m.user},rpc:m.rpc})}));
vi.mock("../apps/main/lib/auth-mail-hook",()=>({authMailConfig:m.config,deliverAuthMessage:m.mail}));
import { submitBusiness } from "../apps/main/app/business-directory/submit/actions";
const data=()=>{const f=new FormData();f.set("name","Example Business");f.set("category_id","category");return f};
beforeEach(()=>{vi.resetAllMocks();m.user.mockResolvedValue({data:{user:{email:"member@example.invalid",email_confirmed_at:"now"}},error:null});m.rpc.mockResolvedValue({data:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",error:null});m.config.mockReturnValue({kind:"gmail",user:"staff@example.invalid"});m.mail.mockResolvedValue(undefined);});
describe("business submission",()=>{
 it("notifies staff and acknowledges the verified account only after saving",async()=>{expect((await submitBusiness({status:"idle",message:""},data())).status).toBe("success");expect(m.rpc).toHaveBeenCalledOnce();expect(m.mail).toHaveBeenCalledTimes(2);expect(m.mail.mock.calls[0][0].to).toBe("staff@example.invalid");expect(m.mail.mock.calls[1][0].to).toBe("member@example.invalid");expect(JSON.stringify(m.mail.mock.calls[0])).not.toContain("Example Business");});
 it("does not claim submission or send mail on database failure",async()=>{m.rpc.mockResolvedValue({data:null,error:{message:"unavailable"}});expect((await submitBusiness({status:"idle",message:""},data())).status).toBe("error");expect(m.mail).not.toHaveBeenCalled();});
 it("does not ask the user to resubmit after an email failure",async()=>{const log=vi.spyOn(console,"error").mockImplementation(()=>{});m.mail.mockRejectedValue(new Error("unavailable"));expect((await submitBusiness({status:"idle",message:""},data())).status).toBe("success");expect(m.mail).toHaveBeenCalledTimes(2);log.mockRestore();});
});
