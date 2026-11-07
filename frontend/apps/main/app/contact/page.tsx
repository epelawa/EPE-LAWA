import type { Metadata } from "next";
import { CONTACT_EMAIL } from "../../lib/contact";
import { pageMetadata } from "../../lib/metadata";
import ContactForm from "./contact-form";

const description = "How to reach EPE LAWA.";

export const metadata: Metadata = pageMetadata({ title: "Contact", description, path: "/contact" });

export default function ContactPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="page-header mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          EPE LAWA
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Contact EPE LAWA</h1>
        <p className="text-muted-foreground mt-4 max-w-sm leading-relaxed">
          Corrections, privacy requests, questions about the project.
        </p>
      </div>

      <div className="prose mb-8">
        <h2 className="mt-8 mb-3 text-lg font-bold">Send a message</h2>
        <p className="text-muted-foreground mb-6">
          Write to us using the form below. Messages are read by a person and replied to as soon as
          possible.
        </p>
        <ContactForm />

        <h2 className="mt-10 mb-3 text-lg font-bold">Other ways to reach us</h2>
        <ul className="list-disc pl-6 text-muted-foreground mb-6">
          <li className="mb-2">
            Email:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline underline-offset-4">
              {CONTACT_EMAIL}
            </a>. This is the only published address.
          </li>
        </ul>
      </div>
    </div>
  );
}
