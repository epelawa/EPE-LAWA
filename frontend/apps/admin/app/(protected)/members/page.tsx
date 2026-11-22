import {  PageFrame, PageIntro, Panel, SubmitButton } from "@epelawa/ui";
import { createStaffClient } from "../../../lib/supabase";
import { messageMember, deleteMember } from "./actions";
export const dynamic = "force-dynamic";
export default async function MembersPage({searchParams}:{searchParams:Promise<{q?:string;page?:string;status?:string}>}) {
 const {q="",page="0",status}=await searchParams; const search=q.trim().slice(0,100); const n=Math.max(0,Math.min(2000,Number.parseInt(page,10)||0));
 const db=await createStaffClient(); const {data:allowed,error:authError}=await db.rpc("staff_roles_authorized");
 if(authError||allowed!==true) return <PageFrame><PageIntro eyebrow="Administration" title="Members" description="Restricted to the primary administrator." /></PageFrame>;
 const {data,error}=await db.rpc("admin_member_list",{p_search:search,p_offset:n*50});
 const members=(data??[]) as {user_id:string;email:string;handle:string;display_name:string}[];
 return <PageFrame className="ui-stack"><PageIntro eyebrow="Administration" title="Members" description="Search member accounts, send in-app messages or permanently delete an account. Staff accounts are excluded."/><Panel>
 {status==="sent"?<p role="status">Message sent to the member’s in-app notifications.</p>:status==="deleted"?<p role="status">Member account deleted.</p>:null}
 <form method="get" className="ui-row"><label>Search email or handle<input name="q" defaultValue={search} maxLength={100}/></label><button type="submit">Search</button></form>
 {error?<p role="alert">Member directory unavailable. The database migration may not be applied.</p>:members.length===0?<p>No members found.</p>:<ul>{members.map(m=><li key={m.user_id} className="ui-stack" style={{padding:"1rem 0"}}><strong>{m.display_name} (@{m.handle})</strong><span>{m.email}</span>
 <details><summary>Send a private in-app message</summary><form action={messageMember} className="ui-stack-sm"><input type="hidden" name="user_id" value={m.user_id}/><label>Title<input name="title" maxLength={140} required/></label><label>Message<textarea name="body" maxLength={1000} required/></label><SubmitButton pendingLabel="Sending…" className="btn-primary" useLegacyClasses>Send message</SubmitButton></form></details>
 <details><summary>Delete account permanently</summary><p>This permanently deletes the account and associated data where database rules allow. It cannot be undone. Records subject to restrictions can prevent deletion.</p><form action={deleteMember} className="ui-stack-sm"><input type="hidden" name="user_id" value={m.user_id}/><label>Type the member email to confirm<input name="confirm_email" type="email" required autoComplete="off"/></label><SubmitButton pendingLabel="Deleting…" className="btn-danger" useLegacyClasses>Permanently delete member</SubmitButton></form></details></li>)}</ul>}
 <nav aria-label="Member pages" className="ui-row">{n>0?<a href={`?q=${encodeURIComponent(search)}&page=${n-1}`}>Previous</a>:null}{members.length===50?<a href={`?q=${encodeURIComponent(search)}&page=${n+1}`}>Next</a>:null}</nav></Panel></PageFrame>;
}
