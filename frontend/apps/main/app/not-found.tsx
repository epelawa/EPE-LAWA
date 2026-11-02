import Link from "next/link";
import { Container, buttonClassName } from "@epelawa/ui";
import RetryButton from "./retry-button";

export default function NotFound() {
  return (
    <Container>
      <div className="notice-page">
        <p className="page-header__eyebrow">EPE LAWA · 404</p>
        <h1>Page not found</h1>
        <p>
          We couldn’t find that page. It may have moved, or the address may be mistyped. Only the
          pages linked in the header and footer exist today.
        </p>
        <div className="notice-page__actions">
          <RetryButton />
          <Link className={buttonClassName("secondary")} href="/">
            Return to the homepage
          </Link>
        </div>
      </div>
    </Container>
  );
}
