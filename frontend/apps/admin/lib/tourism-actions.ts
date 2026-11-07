"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "./supabase";
function value(data:FormData,key:string,max:number){const raw=data.get(key);return typeof raw==="string"?raw.trim().slice(0,max):"";}
function optional(data:FormData,key:string,max:number){return value(data,key,max)||null;}
export async function decideTourismSubmission(data:FormData){
 const id=value(data,"submission_id",36), decision=value(data,"decision",30);
 if(!/^[0-9a-f-]{36}$/i.test(id)||!["published","rejected","needs_revision"].includes(decision)) redirect("/tourism?result=invalid");
 let failed=false;try{const supabase=await createClient();const capability=await supabase.rpc("has_capability",{p_capability:"tourism.review"});if(capability.error||capability.data!==true)redirect("/tourism?result=denied");
 const result=await supabase.rpc("tourism_submission_decide",{p_submission_id:id,p_decision:decision,p_provenance_verified:data.get("provenance_verified")==="yes",p_rights_verified:data.get("rights_verified")==="yes",p_slug:value(data,"slug",180),p_location_label:optional(data,"location_label",300),p_directions_query:optional(data,"directions_query",300),p_latitude:value(data,"latitude",32)?Number(value(data,"latitude",32)):null,p_longitude:value(data,"longitude",32)?Number(value(data,"longitude",32)):null,p_opening_hours:optional(data,"opening_hours",1000),p_price_details:optional(data,"price_details",1000),p_access_details:optional(data,"access_details",1000)});failed=Boolean(result.error);if(result.error)console.error("tourism review action failed",{code:result.error.code});
 }catch(error){if(error&&typeof error==="object"&&"digest" in error)throw error;failed=true;console.error("tourism review unavailable");}
 revalidatePath("/tourism");revalidatePath("/tourism/"+value(data,"slug",180));redirect(`/tourism?result=${failed?"stale":"saved"}`);
}
