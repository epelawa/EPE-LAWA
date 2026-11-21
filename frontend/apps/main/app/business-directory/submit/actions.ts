"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../lib/supabase";
import { authMailConfig, deliverAuthMessage } from "../../../lib/auth-mail-hook";
import { storeLogoDataUrl } from "../../../lib/media-r2";
export type BusinessSubmitState = { status: "idle" | "success" | "error"; message: string };
const field=(f:FormData,k:string)=>{const v=f.get(k);return typeof v==="string"?v.trim():""};
const fail=(message:string):BusinessSubmitState=>({status:"error",message});
export async function submitBusiness(_previous:BusinessSubmitState, f:FormData):Promise<BusinessSubmitState> {
 const supabase=await createClient();
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)return fail("Please sign in before submitting a business. Your entries will remain here while this page is open.");
 if(!user.email_confirmed_at)return fail("Verify your email and sign in again before submitting a business.");
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
 let result;
 try { result=await supabase.rpc("business_submit",{p_name:name,p_category_id:category,p_description:description||null,p_area:area||null,p_address:address||null,p_landmark:landmark||null,p_phone:phone||null,p_whatsapp:whatsapp||null,p_email:email||null,p_website:website||null,p_hours:null,p_logo_key:logoKey}); }
 catch {return fail("We could not confirm whether the submission was saved. Please contact support before trying again to avoid duplicates.");}
 if(result.error||typeof result.data!=="string")return fail(result.error?.message==="member_profile_required"?"This public form only accepts listings from member accounts, and your account does not have a member profile. If you are staff, add the listing from the Business submissions page in the staff workspace instead. Otherwise finish creating your member profile, or sign in with a different member account.":"We could not confirm whether the submission was saved. Please contact support before trying again to avoid duplicates.");
 const id=result.data;
 // A saved listing remains a success even if mail fails; messages contain no listing details.
 try { const config=authMailConfig(process.env); if(config.kind !== "gmail") throw new Error("staff mailbox unavailable"); await deliverAuthMessage({to:config.user,subject:"New EPE LAWA business submission",text:"A new business listing is awaiting review in the private staff workspace.",html:"<p>A new business listing is awaiting review in the private staff workspace.</p>",idempotencyKey:`business-notice/${id}`},config); } catch { console.error("Business submission staff notification unavailable; check the review queue."); }
 try { if(!user.email) throw new Error("account email unavailable"); const config=authMailConfig(process.env); await deliverAuthMessage({to:user.email,subject:"We received your business submission",text:"Thank you for submitting your business to EPE LAWA. Your listing is awaiting review and our team will get in touch soon.",html:"<p>Thank you for submitting your business to EPE LAWA. Your listing is awaiting review and our team will get in touch soon.</p>",idempotencyKey:`business-ack/${id}`},config); } catch { console.error("Business submission acknowledgement unavailable."); }
 try { revalidatePath("/business-directory"); } catch { console.error("Business directory cache revalidation unavailable."); }
 return {status:"success",message:"Submission received. Your listing is unpublished and awaits staff review. Our team will get in touch soon."};
}
