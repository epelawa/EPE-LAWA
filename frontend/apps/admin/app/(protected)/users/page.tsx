import { PageFrame, PageIntro, Panel } from "@epelawa/ui";
import { listUsers, changeCapabilities, setUserActive, getDirectoryExtras } from "./actions";
import { CAPABILITIES } from "../../../lib/capabilities";
import CreateUserForm from "./create-user-form";

export const dynamic="force-dynamic"; export const fetchCache="force-no-store";
export default async function UsersPage({searchParams}:{searchParams:Promise<{q?:string;page?:string}>}) {
 const params=await searchParams; let result:{users:{id:string;email:string;isStaff:boolean;active:boolean;emailConfirmed:boolean;status:string;capabilities:string[]}[];page:number;hasNext:boolean}; let unavailable="";
 try { result=await listUsers(params.q??"",Number(params.page??1)); } catch(e) { result={users:[],page:1,hasNext:false}; unavailable=e instanceof Error?e.message:"User management is unavailable."; }
 let extras={descriptions:{} as Record<string,string>,auditAvailable:false,auditEvents:[] as {action:string;created_at:string;resource_id:string|null;capabilities:string[]}[]};
 if(!unavailable)try{extras=await getDirectoryExtras();}catch{}
 const base=`?q=${encodeURIComponent(params.q??"")}&page=`;
 return <PageFrame><PageIntro eyebrow="Access control" title="Users" description="Manage staff access and account status. Invitations use Supabase Auth email delivery and depend on configured SMTP and callback settings."/>
 {unavailable&&<Panel role="alert"><h2>Directory unavailable</h2><p>{unavailable}</p></Panel>}
 <Panel><form action="/admin/users" method="get"><label htmlFor="q">Search by email</label><input id="q" name="q" type="search" defaultValue={params.q}/><button>Search</button></form></Panel>
 <div className="ui-stack">{result.users.map(u=><Panel key={u.id}><h2>{u.email}</h2><p className="ui-meta">{u.isStaff?`Staff profile — ${u.active?"active":"inactive"}`:"Regular member — no staff profile"} · Email {u.emailConfirmed?"confirmed":"not confirmed"} · Auth account {u.status}</p>
 <form action={changeCapabilities}><input type="hidden" name="id" value={u.id}/><fieldset><legend>Capabilities</legend>{CAPABILITIES.map(cap=><label key={cap} style={{display:"block"}}><input type="checkbox" name="capability" value={cap} defaultChecked={u.capabilities.includes(cap)}/>{" "}{cap}{extras.descriptions[cap]?` — ${extras.descriptions[cap]}`:""}</label>)}</fieldset><button>Save capabilities</button></form>
 {u.isStaff&&<form action={setUserActive}><input type="hidden" name="id" value={u.id}/><input type="hidden" name="active" value={String(!u.active)}/><button>{u.active?"Deactivate staff access":"Activate staff access"}</button></form>}
 </Panel>)}</div><nav aria-label="Directory pages"><a aria-disabled={result.page<=1} href={base+Math.max(1,result.page-1)}>Previous</a> · Page {result.page} · {result.hasNext?<a href={base+(result.page+1)}>Next</a>:<span>End of results</span>}</nav>
 <Panel><h2>Recent staff access changes</h2>{extras.auditAvailable?<>{extras.auditEvents.length?extras.auditEvents.map((event,i)=><p key={`${event.created_at}-${i}`}><strong>{event.action}</strong> · {new Date(event.created_at).toLocaleString()} · resource {event.resource_id??"—"}{event.capabilities.length?` · capabilities: ${event.capabilities.join(", ")}`:""}</p>):<p>No recent staff access changes.</p>}</>:<p>Audit history is unavailable: the current account lacks audit.read or the audit query failed.</p>}</Panel>
 <Panel><h2>Invite account</h2><CreateUserForm/><p>Invitations are sent through Supabase Auth. Email delivery depends on configured Auth SMTP and callback settings. This flow does not generate, display, or store a password or sign-in token.</p></Panel>
 </PageFrame>;
}
