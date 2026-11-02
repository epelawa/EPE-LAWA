import Link from "next/link";
import RetryButton from "./retry-button";

export default function NotFound() {
  return <main><p className="eyebrow">EPE LAWA · 404</p><h1>Page not found</h1><p>We couldn’t find that page. It may have moved or the address may be incorrect.</p><p><RetryButton /> <Link href="/">Return to the homepage</Link></p></main>;
}
