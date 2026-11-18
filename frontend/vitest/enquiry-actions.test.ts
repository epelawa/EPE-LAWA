import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(()=>({ key:vi.fn(), db:vi.fn(), rpc:vi.fn(), config:vi.fn(), send:vi.fn() }));
vi.mock("../apps/main/lib/form-server",()=>({formClientKey:mock.key,formAdminClient:mock.db}));
vi.mock("../apps/main/lib/auth-mail-hook",()=>({authMailConfig:mock.config,deliverAuthMessage:mock.send}));
import {submitEnquiry} from "../apps/main/app/enquiry/actions";
const idle={status:"idle" as const,message:""};
function data(){const f=new FormData();f.set("kind","correction");f.set("name","Synthetic Reader");f.set("email","reader@example.invalid");f.set("message","Please review this article.");return f;}
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv("ENQUIRY_INTAKE_ENABLED","true");mock.key.mockResolvedValue("a".repeat(64));mock.db.mockReturnValue({rpc:mock.rpc});mock.rpc.mockImplementation(async(name:string)=>({data:name === "form_rate_limit" ? true : "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",error:null}));mock.config.mockReturnValue({kind:"gmail",user:"staff@example.invalid"});mock.send.mockResolvedValue(undefined);});
afterEach(()=>vi.unstubAllEnvs());
describe("private enquiry action",()=>{
 it("fails closed when disabled or rate limited",async()=>{vi.stubEnv("ENQUIRY_INTAKE_ENABLED","false");expect((await submitEnquiry(idle,data())).status).toBe("error");expect(mock.db).not.toHaveBeenCalled();vi.stubEnv("ENQUIRY_INTAKE_ENABLED","true");mock.rpc.mockResolvedValueOnce({data:false,error:null});expect((await submitEnquiry(idle,data())).status).toBe("error");expect(mock.rpc).toHaveBeenCalledTimes(1);});
 it("rejects invalid data before database access",async()=>{const f=data();f.set("email","bad");expect((await submitEnquiry(idle,f)).status).toBe("error");expect(mock.db).not.toHaveBeenCalled();});
 it("stores after limiting and notifies Gmail without private message content",async()=>{expect((await submitEnquiry(idle,data())).status).toBe("success");expect(mock.rpc.mock.calls.map(x=>x[0])).toEqual(["form_rate_limit","private_enquiry_submit"]);expect(mock.send).toHaveBeenCalledOnce();expect(JSON.stringify(mock.send.mock.calls[0])).not.toContain("Please review this article");expect(JSON.stringify(mock.send.mock.calls[0])).not.toContain("reader@example.invalid");});
 it("reports successful storage despite notification failure",async()=>{const log=vi.spyOn(console,"error").mockImplementation(()=>{});mock.send.mockRejectedValueOnce(new Error("down"));expect((await submitEnquiry(idle,data())).status).toBe("success");expect(log).toHaveBeenCalledOnce();log.mockRestore();});
 it("does not claim success if storage fails",async()=>{mock.rpc.mockResolvedValueOnce({data:true,error:null}).mockResolvedValueOnce({data:null,error:{}});expect((await submitEnquiry(idle,data())).status).toBe("error");expect(mock.send).not.toHaveBeenCalled();});
});
