import { PageFrame, PageIntro, Panel, Notice } from "@epelawa/ui";
import { createStaffClient } from "../../../lib/supabase";
import { resolveEnquiry } from "./actions";
import ConfirmSubmit from "../../../components/confirm-submit";
export const dynamic="force-dynamic"; export const fetchCache="force-no-store";
type Enquiry = { id:string; kind:string; sender_name:string; sender_email:string; message:string; created_at:string; status:string; revision:number };
export default async function Enquiries({searchParams}:{searchParams:Promise<{result?:string}>}) {
  const db = await createStaffClient();
  let rows: Enquiry[] = []; let failed = false;
  { const {data,error}=await db.rpc("staff_enquiry_list"); if(error) failed=true; else rows=(data??[]) as Enquiry[]; }
  const {result}=await searchParams;
  return <PageFrame className="ui-stack"><PageIntro eyebrow="Private staff workspace" title="Enquiries" description="Private contact, support, advertising and correction messages. Access is restricted and audited." />
    {result && <Notice tone={result === "saved" ? "success" : "danger"} role={result === "saved" ? "status" : "alert"}>{result === "saved" ? "Enquiry marked resolved." : "Could not update the enquiry. Refresh and try again."}</Notice>}
    {failed ? <Panel role="alert">Enquiries are unavailable or your access could not be verified.</Panel> : <Panel className="ui-stack"><h2>Open enquiries · oldest first</h2><p>Reply using your email application and include the reference number. Mark an enquiry resolved only after it has been handled.</p>{rows.length === 0 ? <p>No open enquiries to show.</p> : rows.map(row=><article className="ui-item ui-stack-sm" key={row.id}><h3>{row.kind === "contact" && row.message.startsWith("[Support request]\n") ? "Support" : row.kind} · {row.status}</h3><p>Reference: <code>{row.id}</code></p><p><strong>{row.sender_name}</strong> · {row.sender_email}</p><p><time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" })}</time></p><p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{row.message}</p>{/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(row.sender_email) ? <a className="ui-text-link" href={`mailto:${encodeURIComponent(row.sender_email)}?subject=${encodeURIComponent(`EPE LAWA enquiry ${row.id}`)}`}>Reply by email</a> : null}{row.status === "open" && <form action={resolveEnquiry}><input type="hidden" name="id" value={row.id}/><input type="hidden" name="revision" value={row.revision}/><ConfirmSubmit className="btn-secondary" confirmFirst={false} message="Mark resolved">Mark resolved</ConfirmSubmit></form>}</article>)}</Panel>}
  </PageFrame>;
}
