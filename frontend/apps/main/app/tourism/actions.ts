"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase";
const CONSENT_VERSION = "tourism-intake-v1";
const CONSENT_TEXT = "I confirm the information and source details are submitted for private editorial review, and that any media rights basis is accurately described. I consent to review and understand nothing will be published unless provenance and publication rights are verified.";
function field(data: FormData, key: string, max: number) { const value=data.get(key); return typeof value === "string" ? value.trim().slice(0,max) : ""; }
function https(value: string) { if (!value) return true; try { return new URL(value).protocol === "https:"; } catch { return false; } }
export async function submitTourismContribution(data: FormData) {
 const name=field(data,"name",180), description=field(data,"description",12000), source=field(data,"source_citation",2000), sourceUrl=field(data,"source_url",1000), mediaUrl=field(data,"media_url",1000), mediaRights=field(data,"media_rights",2000);
 if(name.length<2 || description.length<20 || source.length<5 || !https(sourceUrl) || !https(mediaUrl) || (mediaUrl && mediaRights.length<5) || data.get("consent")!=="yes") redirect("/tourism?submission=invalid");
 const supabase=await createClient(); const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError || !user) redirect("/login?next=%2Ftourism");
 const {error}=await supabase.from("tourism_submissions").insert({contributor_id:user.id,name,description,visitor_context:field(data,"visitor_context",3000)||null,visit_details:field(data,"visit_details",3000)||null,source_citation:source,source_url:sourceUrl||null,media_url:mediaUrl||null,media_rights:mediaRights||null,consent_version:CONSENT_VERSION,consent_text:CONSENT_TEXT});
 if(error){console.error("tourism submission failed",{code:error.code});redirect("/tourism?submission=error");}
 revalidatePath("/tourism"); redirect("/tourism?submission=sent");
}
