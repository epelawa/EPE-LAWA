import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { logoDisplayUrl } from "../../../lib/media-r2";
import { publicMediaUrl } from "../../../lib/media";
import { parseBusinessHours, hourRows, businessOpenNow } from "../../../lib/business-hours";
import { EmptyPanel, PageFrame, Panel, StatusBadge } from "../../../components/design-system";
import ClaimBusinessModal from "./claim-modal";
import BusinessContactLinks from "./contact-links";
import styles from "./profile.module.css";
type Props={params:Promise<{slug:string}>};
type Business={id:string;name:string;category_label:string;description:string|null;area:string|null;address:string|null;landmark:string|null;phone:string|null;whatsapp:string|null;email:string|null;website:string|null;hours:Record<string,unknown>|null;is_verified:boolean;logo_key:string|null};
type PhotoRow={media_assets:{object_key:string;provider:string}|null;alt_text:string|null};
export async function generateMetadata({params}:Props):Promise<Metadata>{const {slug}=await params;try{const db=await createClient();const {data}=await db.from("published_businesses").select("name").eq("slug",slug).maybeSingle();if(data?.name)return {title:data.name,description:`Business information for ${data.name}.`,alternates:{canonical:`/business-directory/${encodeURIComponent(slug)}`}};}catch{}return {title:"Business profile"};}
export default async function BusinessProfilePage({params}:Props){
 const {slug}=await params;
 let business:Business|null=null,failed=false,photos:PhotoRow[]=[],claimed=false,signedIn=false,featured=false;
 try{
  const db=await createClient();
  const [result,sessionResult]=await Promise.all([
   db.from("published_businesses").select("id,name,category_label,description,area,address,landmark,phone,whatsapp,email,website,hours,is_verified,logo_key").eq("slug",slug).maybeSingle(),
   db.auth.getUser(),
  ]);
  signedIn=Boolean(sessionResult.data?.user);
  if(result.error)failed=true;
  else{
   business=result.data as Business|null;
   if(business){
    const [photoResult,claimResult,featuredResult]=await Promise.all([
     db.from("business_photos").select("alt_text,media_assets(object_key,provider)").eq("business_id",business.id).order("sort_order",{ascending:true}).limit(12),
     db.from("businesses").select("owner_user_id").eq("id",business.id).maybeSingle(),
     db.from("business_featured").select("ends_at").eq("business_id",business.id).gt("ends_at",new Date().toISOString()).limit(1),
    ]);
    photos=((photoResult.data??[]) as unknown) as PhotoRow[];
    claimed=Boolean((claimResult.data as {owner_user_id:string|null}|null)?.owner_user_id);
    featured=((featuredResult.data??[]).length??0)>0;
    void claimResult.error;
   }
  }
 }catch{failed=true;}
 if(!business&&!failed)notFound();
 if(!business)return <PageFrame><EmptyPanel as="h1" title="Business profile unavailable" description="Please try again later." actions={<Link className="btn-secondary" href={`/business-directory/${encodeURIComponent(slug)}`}>Try again</Link>}/></PageFrame>;
 const logo=logoDisplayUrl(business.logo_key);
 const openNow=businessOpenNow(parseBusinessHours(business.hours));
 const whatsappDigits=business.whatsapp?.replace(/\D/g,"");
 const ctaCount=[business.phone,business.whatsapp,business.website,business.address].filter(Boolean).length;
 const gallery=photos.map(photo=>({url:photo.media_assets?publicMediaUrl(photo.media_assets.object_key):null,alt:photo.alt_text??business.name})).filter(photo=>photo.url);
 return <PageFrame className="ui-stack">
  <Panel className="ui-card ui-stack">
   <header className={styles.identity}>
    {logo ? /* eslint-disable-next-line @next/next/no-img-element */ <img className={styles.logo} src={logo} alt={`${business.name} logo`} width={72} height={72}/> : <span className={styles.logoFallback} aria-hidden="true">{business.name.trim().charAt(0).toUpperCase()||"•"}</span>}
    <div>
     <div className="ui-row"><StatusBadge>{business.category_label}</StatusBadge>{business.is_verified&&<StatusBadge tone="success">Verified business</StatusBadge>}{featured&&<span className={styles.featuredRibbon}>Featured listing</span>}</div>
     <h1 className={styles.name}>{business.name}</h1>
    </div>
   </header>
   {business.description&&<p>{business.description}</p>}
   {ctaCount>0&&<div className={styles.actions}>
    <BusinessContactLinks slug={slug} phone={business.phone} whatsappHref={whatsappDigits?`https://wa.me/${whatsappDigits}`:null} website={business.website} address={business.address} />
   </div>}
   <dl className="ui-grid ui-grid--2 ui-meta">
    {business.area&&<div><dt>Area</dt><dd>{business.area}</dd></div>}
    {business.address&&<div><dt>Address</dt><dd>{business.address}</dd></div>}
    {business.landmark&&<div><dt>Landmark</dt><dd>{business.landmark}</dd></div>}
    {(business.email)&&<div><dt>Email</dt><dd><a href={`mailto:${business.email}`}>{business.email}</a></dd></div>}
   </dl>
   {(() => { const hours=parseBusinessHours(business.hours); const rows=hourRows(hours); if(!Object.keys(hours).length) return null;
    return <section><h2>Opening hours</h2>
     <div className="ui-row" style={{ alignItems: "center" }}>
      {openNow===null?null:openNow? <StatusBadge tone="success">Open now</StatusBadge> : <StatusBadge tone="warning">Closed now</StatusBadge>}
      <span className="ui-meta">Epe time</span>
     </div>
     <dl className="ui-list ui-stack-sm">{rows.map(row => <div className="ui-item ui-row" key={row.day} style={{ justifyContent: "space-between" }}><dt className="ui-item-title" style={{ margin: 0 }}>{row.label}</dt><dd className="ui-meta" style={{ margin: 0 }}>{row.range ?? "Closed"}</dd></div>)}</dl>
    </section>; })()}
   {gallery.length ? <section className="ui-stack-sm" aria-labelledby="business-gallery-heading">
    <h2 id="business-gallery-heading">Photo gallery</h2>
    <ul className={styles.galleryGrid}>{gallery.map((photo,index)=><li key={`${photo.url}-${index}`}>
     {/* eslint-disable-next-line @next/next/no-img-element */}<img className={styles.galleryPhoto} src={photo.url as string} alt={photo.alt} loading="lazy" decoding="async" width={480} height={360}/>
    </li>)}</ul>
   </section> : null}
  </Panel>
  <div className={styles.claimBlock} aria-label="Business ownership">
   {claimed && business.is_verified ? <p className="ui-meta">This listing is managed by its owner and verified by the EPE LAWA desk.</p> : <ClaimBusinessModal businessId={business.id} slug={slug} signedIn={signedIn} />}
  </div>
  <p>Something incorrect? <Link href="/support">Contact support</Link>.</p>
  <Link href="/business-directory">Back to businesses</Link>
 </PageFrame>;
}
