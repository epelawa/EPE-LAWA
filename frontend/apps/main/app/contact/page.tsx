import type { Metadata } from "next";
import { CONTACT_EMAIL } from "../../lib/contact";
import { pageMetadata } from "../../lib/metadata";
import ContactForm from "./contact-form";

const description =
  "How to reach EPE LAWA. Email is the only working route today; the contact form checks your text but cannot deliver it yet.";

export const metadata: Metadata = pageMetadata({ title: "Contact", description, path: "/contact" });

export default function ContactPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="page-header mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          EPE LAWA
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Contact EPE LAWA</h1>
        <p className="text-slate-600 mt-4 max-w-sm leading-relaxed">
          Corrections, privacy requests, questions about the project, or anything the guidelines
          do not cover.
        </p>
      </div>

      <div className="prose mb-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="font-semibold text-red-900 mb-2">Message delivery is not connected yet</h3>
          <p className="text-red-800 text-sm">
            The form below checks what you write, but it cannot send it. Nothing you type is
            stored, forwarded or read by anyone. To reach a person today, email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>

        <h2 className="mt-8 mb-3 text-lg font-bold">Send a message</h2>
        <p className="text-slate-600 mb-6">
          When delivery is connected, messages will go to the address above. Until then, the form
          is here so the layout, labels and error messages can be reviewed and tested for real.
        </p>
        <ContactForm />

        <h2 className="mt-10 mb-3 text-lg font-bold">Other ways to reach us</h2>
        <ul className="list-disc pl-6 text-slate-600 mb-6">
          <li className="mb-2">
            Email:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 underline underline-offset-4">
              {CONTACT_EMAIL}
            </a>
            . This is the only published address and it is used for everything, including
            corrections and account deletion requests.
          </li>
          <li className="mb-2">
            WhatsApp: no number has been published yet. A WhatsApp link that opens nothing would
            be worse than saying so, so there is no WhatsApp button on this page.
          </li>
        </ul>

        <h2 className="mt-8 mb-3 text-lg font-bold">Emergencies</h2>
        <p className="text-slate-600">
          This is not an emergency service. Nothing sent through this site is monitored. If
          someone is in danger, contact the Nigeria Police Force or emergency services directly.
        </p>
      </div>
    </div>
  );
}
