import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { logoDisplayUrl } from "../../../lib/media-r2";
import { EmptyPanel, PageFrame, Panel, StatusBadge } from "../../../components/design-system";
import styles from "./profile.module.css";
type Props={params:Promise<{slug:string}>};
type Business={name:string;category_label:string;description:string|null;area:string|null;address:string|null;landmark:string|null;phone:string|null;whatsapp:string|null;email:string|null;website:string|null;hours:Record<string,unknown>|null;is_verified:boolean;logo_key:string|null};
export async function generateMetadata({params}:Props):Promise<Metadata>{const {slug}=await params;try{const db=await createClient();const {data}=await db.from("published_businesses").select("name").eq("slug",slug).maybeSingle();if(data?.name)return {title:data.name,description:`Business information for ${data.name}.`,alternates:{canonical:`/business-directory/${encodeURIComponent(slug)}`}};}catch{}return {title:"Business profile"};}
export default async function BusinessProfilePage({params}:Props){
 const {slug}=await params;let business:Business|null=null,failed=false;
 try{const db=await createClient();const result=await db.from("published_businesses").select("name,category_label,description,area,address,landmark,phone,whatsapp,email,website,hours,is_verified,logo_key").eq("slug",slug).maybeSingle();if(result.error)failed=true;else business=result.data as Business|null;}catch{failed=true;}
 if(!business&&!failed)notFound();
 if(!business)return <PageFrame><EmptyPanel title="Business profile unavailable" description="Please try again later." actions={<Link className="btn-secondary" href={`/business-directory/${encodeURIComponent(slug)}`}>Try again</Link>}/></PageFrame>;
 const logo=logoDisplayUrl(business.logo_key);
 const whatsappDigits=business.whatsapp?.replace(/\D/g,"");
 const ctaCount=[business.phone,business.whatsapp,business.website].filter(Boolean).length;
 return <PageFrame className="ui-stack">
  <Panel className="ui-card ui-stack">
   <header className={styles.identity}>
    {logo ? /* eslint-disable-next-line @next/next/no-img-element */ <img className={styles.logo} src={logo} alt={`${business.name} logo`} width={72} height={72}/> : <span className={styles.logoFallback} aria-hidden="true">{business.name.trim().charAt(0).toUpperCase()||"•"}</span>}
    <div>
     <div className="ui-row"><StatusBadge>{business.category_label}</StatusBadge>{business.is_verified&&<StatusBadge tone="success">Verified business</StatusBadge>}</div>
     <h1 className={styles.name}>{business.name}</h1>
    </div>
   </header>
   {business.description&&<p>{business.description}</p>}
   {ctaCount>0&&<div className={styles.actions}>
    {business.phone&&<a className="btn-primary" href={`tel:${business.phone}`}>Call {business.phone}</a>}
    {whatsappDigits&&<a className="btn-secondary" href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>}
    {business.website&&<a className="btn-ghost" href={business.website} target="_blank" rel="noopener noreferrer">Visit website <span aria-hidden="true">↗</span></a>}
   </div>}
   <dl className="ui-grid ui-grid--2 ui-meta">
    {business.area&&<div><dt>Area</dt><dd>{business.area}</dd></div>}
    {business.address&&<div><dt>Address</dt><dd>{business.address}</dd></div>}
    {business.landmark&&<div><dt>Landmark</dt><dd>{business.landmark}</dd></div>}
    {(business.email)&&<div><dt>Email</dt><dd><a href={`mailto:${business.email}`}>{business.email}</a></dd></div>}
   </dl>
   {business.hours&&<section><h2>Opening hours</h2><p>{Object.entries(business.hours).map(([day,value])=>`${day}: ${typeof value === "string" ? value : JSON.stringify(value)}`).join(" · ")}</p></section>}
  </Panel>
  <p>Something incorrect? <Link href="/support">Contact support</Link>.</p>
  <Link href="/business-directory">Back to businesses</Link>
 </PageFrame>;
}
