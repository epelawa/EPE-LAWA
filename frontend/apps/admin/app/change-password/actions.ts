"use server";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "../../lib/supabase";
export async function updatePassword(form:FormData) {
 const current=String(form.get("currentPassword")??""), password=String(form.get("password")??"");
 if(!current || password.length<12 || password.length>1024 || current===password) throw new Error("Enter your current password and a different new password of at least 12 characters.");
 const db=await createClient({allowPasswordChange:true}); const {data:{user},error:userError}=await db.auth.getUser();
 if(userError || !user?.email) throw new Error("Session could not be verified.");
 const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_PUBLISHABLE_KEY;
 if(!url || !key) throw new Error("Password change is unavailable.");
 const verifier=createSupabaseClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:verified,error:verifyError}=await verifier.auth.signInWithPassword({email:user.email,password:current});
 if(verifyError || !verified.user || verified.user.id!==user.id) throw new Error("Current password is incorrect.");
 const {error}=await db.auth.updateUser({password}); if(error) throw new Error("Password update failed.");
 const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY; if(!serviceKey) throw new Error("Password changed; account-state update is unavailable. Contact an administrator.");
 const service=createSupabaseClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {error:clearError}=await service.rpc("staff_user_clear_password_change",{p_user_id:user.id});
 if(clearError) throw new Error("Password changed, but the required account state could not be cleared. Contact an administrator."); redirect("/admin");
}
