import { PageFrame, PageIntro, Panel } from "@epelawa/ui";
import { createStaffClient } from "../../../lib/supabase";
import { broadcast } from "./actions";
export const dynamic="force-dynamic";
export default async function BroadcastPage({searchParams}:{searchParams:Promise<{status?:string}>}){
 const {status}=await searchParams;
 const db=await createStaffClient(); const {data,error}=await db.rpc("staff_roles_authorized");
 if(error||data!==true) return <PageFrame><PageIntro eyebrow="Administration" title="Broadcast" description="Restricted to the primary administrator."/></PageFrame>;
 return <PageFrame><PageIntro eyebrow="Administration" title="Broadcast" description="Send an in-app notification to verified member accounts. Staff-only accounts are excluded; this does not send email or push."/><Panel>{status==="sent"?<p role="status">Broadcast sent to eligible members’ in-app notifications.</p>:null}<form action={broadcast} className="ui-stack"><label>Title<input name="title" maxLength={140} required/></label><label>Message<textarea name="body" maxLength={1000} required/></label><label><input type="checkbox" name="confirm" value="yes" required/> I confirm this will notify all verified members.</label><button type="submit">Send broadcast</button></form></Panel></PageFrame>;
}
