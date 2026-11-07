import type { Metadata } from "next";
import Link from "next/link";
import { submitBusinessReview } from "../review-actions";
import { OrderRequestForm } from "../order-request-form";
import { notFound } from "next/navigation";
import { createClient } from "../../../lib/supabase";

type Props = { params: Promise<{ slug: string }> };
type Business = { id: string; slug: string; name: string; category_label: string; description: string | null; area: string | null; address: string | null; landmark: string | null; phone: string | null; whatsapp: string | null; email: string | null; website: string | null; hours: Record<string, unknown> | null; is_verified: boolean };
type Product = { id: string; name: string; description: string | null; price_kobo: number; currency: string };
type Review = { rating: number; body: string | null; created_at: string };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("published_businesses").select("name").eq("slug", slug).maybeSingle();
    if (data?.name) return { title: data.name, description: `Public profile and catalogue for ${data.name}.`, alternates: { canonical: `/business-directory/${encodeURIComponent(slug)}` } };
  } catch { /* Keep generic metadata when the public data service is unavailable. */ }
  return { title: "Business profile", description: "View a published Epe business profile and its public catalogue.", alternates: { canonical: `/business-directory/${encodeURIComponent(slug)}` } };
}

export default async function BusinessProfilePage({ params }: Props) {
  const { slug } = await params;
  let business: Business | null = null;
  let products: Product[] = [];
  let reviews: Review[] = [];
  let sponsored = false;
  let failed = false;
  try {
    const supabase = await createClient();
    const result = await supabase.from("published_businesses").select("id,slug,name,category_label,description,area,address,landmark,phone,whatsapp,email,website,hours,is_verified").eq("slug", slug).maybeSingle();
    if (result.error) failed = true;
    else if (result.data) {
      business = result.data as Business;
      const [productResult, reviewResult, sponsorshipResult] = await Promise.all([
        supabase.from("products").select("id,name,description,price_kobo,currency").eq("business_id", business.id).eq("is_available", true).is("deleted_at", null).order("name").limit(100),
        supabase.from("business_reviews").select("rating,body,created_at").eq("business_id", business.id).eq("state", "visible").is("deleted_at", null).order("created_at", { ascending: false }).limit(50),
        supabase.from("active_business_sponsorships").select("business_id").eq("business_id", business.id).limit(1),
      ]);
      if (productResult.error || reviewResult.error || sponsorshipResult.error) failed = true;
      else {
        products = (productResult.data ?? []) as Product[];
        reviews = (reviewResult.data ?? []) as Review[];
        sponsored = (sponsorshipResult.data ?? []).length > 0;
      }
    }
  } catch { failed = true; }
  if (!business && !failed) notFound();
  if (!business) return <div className="ep-container py-12"><section className="card p-6" role="status"><h1 className="text-2xl font-bold">Business profile unavailable</h1><p className="mt-2 text-muted-foreground">The public profile could not be loaded. Please try again later.</p><Link className="mt-4 inline-block underline" href="/business-directory">Return to the directory</Link></section></div>;

  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : null;
  return <div className="ep-container py-12">
    <nav aria-label="Breadcrumb" className="mb-6 text-sm"><Link className="underline" href="/business-directory">Business directory</Link><span aria-hidden="true"> / </span><span>{business.name}</span></nav>
    <header className="card p-6 sm:p-8">{sponsored ? <p className="mb-2 inline-block rounded-full border px-3 py-1 text-xs font-bold">Sponsored</p> : null}<p className="text-sm font-semibold text-primary">{business.category_label}</p><h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{business.name}</h1>{business.is_verified ? <p className="mt-3 inline-block rounded-full border px-3 py-1 text-sm font-semibold">Verified</p> : null}{business.description ? <p className="mt-4 max-w-3xl leading-relaxed text-muted-foreground">{business.description}</p> : null}<dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">{business.area ? <div><dt className="font-semibold">Area</dt><dd>{business.area}</dd></div> : null}{business.address ? <div><dt className="font-semibold">Address</dt><dd>{business.address}</dd></div> : null}{business.landmark ? <div><dt className="font-semibold">Landmark</dt><dd>{business.landmark}</dd></div> : null}{business.phone ? <div><dt className="font-semibold">Phone</dt><dd><a className="underline" href={`tel:${business.phone}`}>{business.phone}</a></dd></div> : null}{business.whatsapp ? <div><dt className="font-semibold">WhatsApp</dt><dd><a className="underline" href={`https://wa.me/${business.whatsapp.replace(/\D/g, "")}`} rel="noreferrer">Contact on WhatsApp</a></dd></div> : null}{business.email ? <div><dt className="font-semibold">Email</dt><dd><a className="underline" href={`mailto:${business.email}`}>{business.email}</a></dd></div> : null}{business.website ? <div><dt className="font-semibold">Website</dt><dd><a className="underline" href={business.website} rel="noreferrer">Visit website</a></dd></div> : null}</dl>{business.hours ? <section className="mt-5"><h2 className="font-semibold">Hours</h2><p className="mt-1 break-words text-sm text-muted-foreground">{Object.entries(business.hours).map(([day, value]) => `${day}: ${typeof value === "string" ? value : JSON.stringify(value)}`).join(" · ")}</p></section> : null}</header>
    {failed ? <section className="card mt-8 p-5" role="status"><h2 className="font-semibold">Some profile information could not be loaded</h2><p className="mt-1 text-sm text-muted-foreground">Product and review details are temporarily unavailable.</p></section> : null}
    <section className="mt-8"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="page-header__eyebrow">Catalogue</p><h2 className="text-2xl font-bold">Products</h2></div><p className="text-sm font-semibold">Order requests available · payment unavailable</p></div>{products.length ? <ul className="grid gap-4 sm:grid-cols-2">{products.map((product) => <li key={product.id} className="card p-5"><h3 className="text-lg font-bold">{product.name}</h3>{product.description ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{product.description}</p> : null}<p className="mt-3 font-semibold">{product.currency === "NGN" ? "₦" : ""}{(product.price_kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}{product.currency !== "NGN" ? ` ${product.currency}` : ""}</p><p className="mt-2 text-xs text-muted-foreground">Payment unavailable — this request does not charge you.</p><OrderRequestForm productId={product.id} /></li>)}</ul> : !failed ? <p className="card p-5 text-muted-foreground">No public products are currently listed.</p> : null}</section>
    <section className="card mt-8 p-5"><h2 className="text-xl font-bold">Write a review</h2><p className="mt-2 text-sm text-muted-foreground">Email-verified active member access is required. One review per member is allowed.</p><form action={submitBusinessReview} className="mt-4 grid max-w-xl gap-4"><input type="hidden" name="business_id" value={business.id} /><label className="grid gap-2 font-semibold">Rating<select name="rating" required defaultValue="" className="rounded-lg border p-3 font-normal"><option value="" disabled>Choose a rating</option>{[5,4,3,2,1].map(n => <option key={n} value={n}>{n} / 5</option>)}</select></label><label className="grid gap-2 font-semibold">Review<textarea name="body" maxLength={4000} rows={4} className="rounded-lg border p-3 font-normal" /></label><button type="submit" className="min-h-11 w-fit rounded bg-primary px-4 py-2 font-semibold text-white">Submit review</button></form></section>
    <section className="mt-10"><div className="mb-4 flex items-end justify-between gap-3"><div><p className="page-header__eyebrow">Community feedback</p><h2 className="text-2xl font-bold">Reviews</h2></div>{average !== null ? <p className="text-sm">{average.toFixed(1)} / 5 · {reviews.length} {reviews.length === 1 ? "review" : "reviews"}</p> : null}</div>{reviews.length ? <ul className="space-y-3">{reviews.map((review, index) => <li key={`${review.created_at}-${index}`} className="card p-5"><p className="font-semibold">{review.rating} / 5</p>{review.body ? <p className="mt-2 leading-relaxed">{review.body}</p> : null}<time className="mt-2 block text-xs text-muted-foreground" dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString("en-NG")}</time></li>)}</ul> : !failed ? <p className="card p-5 text-muted-foreground">No public reviews are available yet.</p> : null}</section>
    <p className="mt-8"><Link className="underline" href="/business-directory">Back to all businesses</Link></p>
  </div>;
}
