import { PageFrame, PageIntro, Panel, Notice } from "@epelawa/ui";
import { createClient } from "../../../lib/supabase";
import { resolveEnquiry } from "./actions";
export const dynamic="force-dynamic"; export const fetchCache="force-no-store";
type Enquiry = { id:string; kind:string; sender_name:string; sender_email:string; message:string; created_at:string; status:string; revision:number };
export default async function Enquiries({searchParams}:{searchParams:Promise<{result?:string}>}) {
  let rows: Enquiry[] = []; let failed = false;
  try { const db = await createClient(); const {data,error}=await db.rpc("staff_enquiry_list"); if(error) failed=true; else rows=(data??[]) as Enquiry[]; } catch { failed=true; }
  const {result}=await searchParams;
  return <PageFrame className="ui-stack"><PageIntro eyebrow="Private staff workspace" title="Enquiries" description="Private contact, advertising and correction messages. Access is restricted and audited." />
    {result && <Notice tone={result === "saved" ? "success" : "danger"} role={result === "saved" ? "status" : "alert"}>{result === "saved" ? "Enquiry marked resolved." : "Could not update the enquiry. Refresh and try again."}</Notice>}
    {failed ? <Panel role="alert">Enquiries are unavailable or your access could not be verified.</Panel> : <Panel className="ui-stack"><h2>Open enquiries · oldest first</h2>{rows.length === 0 ? <p>No open enquiries to show.</p> : rows.map(row=><article className="ui-item ui-stack-sm" key={row.id}><h3>{row.kind} · {row.status}</h3><p><strong>{row.sender_name}</strong> · {row.sender_email}</p><p><time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString("en-NG")}</time></p><p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{row.message}</p>{row.status === "open" && <form action={resolveEnquiry}><input type="hidden" name="id" value={row.id}/><input type="hidden" name="revision" value={row.revision}/><button type="submit" className="btn-secondary">Mark resolved</button></form>}</article>)}</Panel>}
  </PageFrame>;
}
