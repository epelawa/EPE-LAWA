"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase";
const value=(f:FormData,k:string,max:number)=>String(f.get(k)??"").trim().slice(0,max);
export async function requestProductOrder(f:FormData):Promise<void>{
 const db=await createClient(); const {data:{user},error:authError}=await db.auth.getUser();
 if(authError||!user) redirect("/login?next=%2Fbusiness-directory");
 if(!user.email_confirmed_at) redirect("/business-directory?business_error=verify-email");
 const id=value(f,"product_id",36),quantity=Number(value(f,"quantity",4)),method=value(f,"method",16),name=value(f,"contact_name",120),phone=value(f,"contact_phone",32),address=value(f,"address",500),landmark=value(f,"landmark",300),notes=value(f,"notes",1000);
 if(!/^[0-9a-f-]{36}$/i.test(id)||!Number.isInteger(quantity)||quantity<1||quantity>999||!['pickup','delivery'].includes(method)||!name||!phone||(method==='delivery'&&address.length<5)) redirect("/business-directory?order=invalid");
 const {error}=await db.rpc("marketplace_order_request",{p_product_id:id,p_quantity:quantity,p_contact_name:name,p_contact_phone:phone,p_method:method,p_address:address||null,p_landmark:landmark||null,p_notes:notes||null});
 if(error){console.error("marketplace request failed",{code:error.code});redirect("/business-directory?order=unavailable");}
 revalidatePath("/business-directory"); redirect("/business-directory?order=requested");
}
