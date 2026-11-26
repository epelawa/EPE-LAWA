"use server";
import { revalidatePath } from "next/cache";
import { authMailConfig, deliverAuthMessage } from "../../../lib/auth-mail-hook";
import { storeLogoDataUrl } from "../../../lib/media-r2";
import { parseBusinessHours } from "../../../lib/business-hours";
import { formAdminClient, formRateAllowance, formRateMessage } from "../../../lib/form-server";
import { resolvePublicSubmitter, slugifyTitle } from "../../../lib/public-submitter";

async function rateGate(): Promise<string | null> { return (await formRateAllowance("business_submit")) ? null : formRateMessage(); }
export type BusinessSubmitState = { status: "idle" | "success" | "error"; message: string };
const field=(f:FormData,k:string)=>{const v=f.get(k);return typeof v==="string"?v.trim():""};
const fail=(message:string):BusinessSubmitState=>({status:"error",message});
export async function submitBusiness(_previous:BusinessSubmitState, f:FormData):Promise<BusinessSubmitState> {
 const limiter=await rateGate();if(limiter)return fail(limiter);
 const who=await resolvePublicSubmitter(f);
 if(!who.ok)return fail(who.message);
 const submitter=who.submitter;
 const name=field(f,"name"),category=field(f,"category_id"),description=field(f,"description"),area=field(f,"area"),address=field(f,"address"),landmark=field(f,"landmark"),phone=field(f,"phone"),whatsapp=field(f,"whatsapp"),email=field(f,"email"),website=field(f,"website");
 if(name.length<2||name.length>160||!category||description.length>4000||area.length>160||address.length>300||landmark.length>200||phone.length>24||whatsapp.length>24||email.length>254||website.length>2048)return fail("Check the listing fields and their length limits.");
 const phoneRx=/^\+?[0-9][0-9 ()-]{6,19}$/;
 if((phone&&!phoneRx.test(phone))||(whatsapp&&!phoneRx.test(whatsapp)))return fail("Enter a valid phone number.");
 if(email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return fail("Enter a valid email address.");
 if(website){try{if(new URL(website).protocol!=="https:")return fail("Website must use a valid HTTPS address.")}catch{return fail("Website must use a valid HTTPS address.")}}
 const logoUrl=field(f,"logo_url");
 if(logoUrl){try{if(new URL(logoUrl).protocol!=="https:")return fail("The logo link must use a valid HTTPS address.")}catch{return fail("The logo link must use a valid HTTPS address.")}}
 let logoKey:string|null=logoUrl||null;
 const logoData=field(f,"logo_data");
 if(logoData){
  const stored=await storeLogoDataUrl(logoData,name);
  if("error" in stored){
   if(stored.error==="unconfigured")return fail("Logo storage is not connected on this deployment yet. Remove the chosen logo or paste an HTTPS logo link instead — everything else in your listing is unaffected.");
   if(stored.error==="unavailable")return fail("The logo could not be stored right now. Remove it and try again in a moment, or continue without a logo.");
   return fail("That logo file could not be used. Choose a JPEG, PNG or WebP image smaller than 5 MB.");
  }
  logoKey=stored.key;
 }
 let result:{data:{id:string}|null;error:{code?:string}|null};
 let hours:Record<string,string>|null=null;
 const hoursRaw=field(f,"hours_json");
 if(hoursRaw){
  try { const parsed=parseBusinessHours(JSON.parse(hoursRaw)); hours=Object.keys(parsed).length?parsed:null; }
  catch { hours=null; }
 }
 let db;
 try { db=formAdminClient(); } catch { return fail("Submissions are temporarily unavailable. Nothing was saved — please try again shortly."); }
 const {data:cat}=await db.from("business_categories").select("id").eq("id",category).eq("is_active",true).maybeSingle();
 if(!cat)return fail("Choose a category from the list.");
 try {
  result=await db.from("businesses").insert({
   slug:slugifyTitle(name,"business"),owner_user_id:submitter.memberId,name,category_id:category,
   description:description||null,area:area||null,address:address||null,landmark:landmark||null,
   phone:phone||null,whatsapp:whatsapp||null,email:email||null,website:website||null,hours,logo_key:logoKey,status:"submitted",
   submitter_name:submitter.guest?submitter.name:null,submitter_email:submitter.guest?submitter.email:null,
  }).select("id").single();
 } catch { return fail("We could not reach the listing service, so nothing was saved. Please try again in a moment."); }
 if(result.error||!result.data?.id){
  console.error("Business submission insert failed",result.error?.code);
  return fail("Your listing could not be saved. Check the fields and try again — nothing was published.");
 }
 try { await db.rpc("audit_event",{p_actor_kind:"system",p_action:"business.public_submit",p_resource_type:"business",p_resource_id:result.data.id,p_outcome:"success",p_metadata:{guest:submitter.guest,member:Boolean(submitter.memberId)}}); } catch { /* audit is best effort */ }
 const id=result.data.id as string;
 // A saved listing remains a success even if mail fails; messages contain no listing details.
 try { const config=authMailConfig(process.env); if(config.kind !== "gmail") throw new Error("staff mailbox unavailable"); await deliverAuthMessage({to:config.user,subject:"New EPE LAWA business submission",text:"A new business listing is awaiting review in the private staff workspace.",html:"<p>A new business listing is awaiting review in the private staff workspace.</p>",idempotencyKey:`business-notice/${id}`},config); } catch { console.error("Business submission staff notification unavailable; check the review queue."); }
 try { if(!submitter.email) throw new Error("contact email unavailable"); const config=authMailConfig(process.env); await deliverAuthMessage({to:submitter.email,subject:"We received your business submission",text:"Thank you for submitting your business to EPE LAWA. Your listing is awaiting review and our team will get in touch soon.",html:"<p>Thank you for submitting your business to EPE LAWA. Your listing is awaiting review and our team will get in touch soon.</p>",idempotencyKey:`business-ack/${id}`},config); } catch { console.error("Business submission acknowledgement unavailable."); }
 try { revalidatePath("/business-directory"); } catch { console.error("Business directory cache revalidation unavailable."); }
 return {status:"success",message:"Submission received. Your listing is unpublished and awaits staff review. Our team will get in touch soon."};
}
