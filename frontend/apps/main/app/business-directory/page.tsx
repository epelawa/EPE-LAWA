import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { logoDisplayUrl } from "../../lib/media-r2";
import { SearchIcon, BuildingIcon, MapPinIcon } from "../../components/icons";
import styles from "./directory.module.css";

export const metadata: Metadata = { title: "Business directory", description: "Discover local businesses around Epe.", alternates: { canonical: "/business-directory" } };
type Search = { q?: string | string[]; area?: string | string[]; category?: string | string[]; page?: string | string[] };
type Category = { slug: string; label: string };
type Business = { id: string; slug: string; name: string; category_label: string; description: string | null; area: string | null; address: string | null; phone: string | null; whatsapp: string | null; is_verified: boolean; logo_key: string | null };
type FeaturedBusiness = Pick<Business, "id" | "slug" | "name" | "category_label" | "area" | "description" | "logo_key">;
const one = (value: string | string[] | undefined) => typeof value === "string" ? value.trim().slice(0,100) : "";
function directoryHref(q:string,area:string,category:string,page=1) {const p=new URLSearchParams();if(q)p.set("q",q);if(area)p.set("area",area);if(category)p.set("category",category);if(page>1)p.set("page",String(page));const suffix=p.toString();return suffix ? `/business-directory?${suffix}` : "/business-directory";}
export default async function BusinessDirectoryPage({searchParams}:{searchParams:Promise<Search>}) {
 const params=await searchParams, q=one(params.q),area=one(params.area),category=one(params.category);
 const requested=one(params.page); const page=/^\d{1,4}$/.test(requested) ? Math.min(1000,Math.max(1,Number(requested))) : 1;
 let businesses:Business[]=[],categories:Category[]=[],failed=false,hasNext=false,featured:FeaturedBusiness[]=[];
 try {
  const db=await createClient();
  const [list,cats]=await Promise.all([db.rpc("business_discovery_search",{p_query:q,p_area:area,p_category:category,p_offset:(page-1)*12}).select("id,slug,name,category_label,description,area,address,phone,whatsapp,is_verified,logo_key"),db.from("business_categories").select("slug,label").eq("is_active",true).order("sort_order").order("label").limit(100)]);
  if(list.error||cats.error){console.error("public business directory read failed",{code:list.error?.code??cats.error?.code});failed=true;}
  else {const rows=(list.data??[]) as Business[]; businesses=rows.slice(0,12);hasNext=rows.length>12&&page<1000;categories=(cats.data??[]) as Category[];}
  if(!failed){
   const featuredResult=await db.from("business_featured").select("business_id,businesses!inner(id,slug,name,category_label,area,description)").gt("ends_at",new Date().toISOString()).order("ends_at",{ascending:false}).limit(3);
   if(!featuredResult.error) featured=(((featuredResult.data??[]) as unknown) as {businesses:FeaturedBusiness|null}[]).map(row=>row.businesses).filter((row):row is FeaturedBusiness=>Boolean(row));
  }
 } catch {failed=true;}
 const filtered=Boolean(q||area||category);
 return <div className={styles.page}>
  <header className={styles.hero}><div className={styles.heroInner}><div><span className={styles.heroBadge}>EpeLawa · Business directory</span><h1>Discover businesses in Epe.</h1><p>Find trusted local shops, services and professionals within your community — every listing is checked by our editorial team before it appears.</p></div><Link className={styles.submit} href="/business-directory/submit">Submit a business <span aria-hidden="true">↗</span></Link></div></header>
  <form action="/business-directory" method="get" role="search" aria-label="Filter published business listings" className={styles.search}>
   <label className={styles.mainField}><span>What are you looking for?</span><div><SearchIcon size={19}/><input name="q" type="search" defaultValue={q} maxLength={100} placeholder="Search businesses, services or keywords" data-slash-focus/></div></label>
   <label className={styles.areaField}><span>Area or community</span><input name="area" defaultValue={area} maxLength={100} placeholder="Enter an area"/></label>
   {category && <input type="hidden" name="category" value={category}/>}
   <button type="submit">Search businesses</button>
  </form>
  {categories.length>0 && <section className={styles.categories} aria-labelledby="directory-categories"><div className={styles.sectionHeading}><h2 id="directory-categories">Explore categories</h2>{category && <Link href={directoryHref(q,area,"")}>All categories</Link>}</div><nav aria-label="Business categories"><ul className={styles.categoryList}>{categories.map(c=><li key={c.slug}><Link href={directoryHref(q,area,c.slug)} aria-current={category===c.slug?"page":undefined}><span aria-hidden="true"><BuildingIcon size={18}/></span>{c.label}</Link></li>)}</ul></nav></section>}
  {featured.length>0 && !filtered && <section className={styles.results} aria-labelledby="directory-featured"><div className={styles.sectionHeading}><div><h2 id="directory-featured">Featured this week</h2></div><span className="ui-meta">Highlighted listings paying for placement; the desk discloses every slot.</span></div>
   <ul className={styles.grid}>{featured.map(b=><li key={b.id}><article className={styles.card}><div className={styles.cardArtwork} aria-hidden="true"><span className={styles.cardLetter}>{b.name.trim().charAt(0).toUpperCase()||"•"}</span></div><div className={styles.cardBody}><span className={styles.cardCat}>{b.category_label}</span><h3><Link href={`/business-directory/${encodeURIComponent(b.slug)}`}>{b.name}</Link></h3>{b.description && <p className={styles.description}>{b.description}</p>}{b.area && <p className={styles.location}><MapPinIcon size={14}/>{b.area}</p>}<Link className={styles.view} href={`/business-directory/${encodeURIComponent(b.slug)}`}>View business <span aria-hidden="true">→</span></Link></div></article></li>)}</ul>
  </section>}
  <section className={styles.results} aria-labelledby="directory-results"><div className={styles.sectionHeading}><div><h2 id="directory-results">Businesses to explore</h2></div>{filtered && <Link href="/business-directory">Clear filters</Link>}</div>
   {failed ? <div className={styles.state} role="alert"><h3>We couldn’t load the directory</h3><p>Please try again. Your search has not been lost.</p><Link className={styles.button} href={directoryHref(q,area,category,page)}>Try again</Link></div> : businesses.length===0 ? <div className={styles.state}><h3>{filtered ? "No businesses match your search" : "No businesses are published yet"}</h3><p>{filtered ? "Try another name or area, or clear your filters." : "Approved local listings will appear here."}</p>{filtered && <Link className={styles.button} href="/business-directory">Clear filters</Link>}</div> : <>
    <p className={styles.resultCount}>Showing {businesses.length} {businesses.length===1?"business":"businesses"}{page>1 ? ` · page ${page}` : ""}</p>
    <ul className={styles.grid}>{businesses.map(b=><li key={b.id}><article className={styles.card}><div className={styles.cardArtwork} aria-hidden="true">{b.logo_key && logoDisplayUrl(b.logo_key) ? /* eslint-disable-next-line @next/next/no-img-element */ <img className={styles.cardLogoImg} src={logoDisplayUrl(b.logo_key) ?? undefined} alt="" width={64} height={64} loading="lazy" decoding="async"/> : <span className={styles.cardLetter}>{b.name.trim().charAt(0).toUpperCase()||"•"}</span>}</div>{b.is_verified && <span className={styles.verifiedChip}>✓ Verified</span>}<div className={styles.cardBody}><span className={styles.cardCat}>{b.category_label}</span><h3><Link href={`/business-directory/${encodeURIComponent(b.slug)}`}>{b.name}</Link></h3>{b.description && <p className={styles.description}>{b.description}</p>}{(b.area||b.address) && <p className={styles.location}><MapPinIcon size={14}/>{b.area||b.address}</p>}<div className={styles.contacts}>{b.phone&&<a href={`tel:${b.phone}`}>Call</a>}{b.whatsapp&&<a href={`https://wa.me/${b.whatsapp.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}{!b.phone&&!b.whatsapp&&<Link href={`/business-directory/${encodeURIComponent(b.slug)}`}>View details</Link>}</div><Link className={styles.view} href={`/business-directory/${encodeURIComponent(b.slug)}`}>View business <span aria-hidden="true">→</span></Link></div></article></li>)}</ul>
    <nav className={styles.pagination} aria-label="Business directory pages">{page>1 && <Link href={directoryHref(q,area,category,page-1)}>Previous</Link>}<span>Page {page}</span>{hasNext && <Link href={directoryHref(q,area,category,page+1)}>Next</Link>}</nav></>}
  </section>
  <p className={styles.report}>Need to report incorrect information? <Link href="/support">Contact support</Link>.</p>
 </div>;
}
