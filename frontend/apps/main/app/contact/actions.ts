"use server";

/**
 * Contact form handler.
 *
 * There is no email provider configured, so this action validates the input and then says
 * plainly that the message was not delivered. It never claims delivery, never stores the
 * message and never logs a field value — a fake success here would be worse than no form.
 *
 * No rate limiting is applied on purpose: nothing is received, stored or forwarded, so
 * there is nothing to abuse yet. When delivery is connected this must be rate limited on
 * the server, with the message body held in a queue rather than in memory.
 */

export type ContactField = "name" | "email" | "subject" | "message";

export type ContactState = {
  status: "idle" | "invalid" | "undelivered";
  errors: Partial<Record<ContactField, string>>;
};

const limits = {
  name: 100,
  email: 254,
  subject: 150,
  message: 5000,
} satisfies Record<ContactField, number>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function read(formData: FormData, field: ContactField): string {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

export async function submitContactMessage(
  _previous: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const name = read(formData, "name");
  const email = read(formData, "email");
  const subject = read(formData, "subject");
  const message = read(formData, "message");

  const errors: Partial<Record<ContactField, string>> = {};

  if (!name) errors.name = "Enter your name.";
  else if (name.length > limits.name) errors.name = `Use ${limits.name} characters or fewer.`;

  if (!email) errors.email = "Enter an email address.";
  else if (!emailPattern.test(email) || email.length > limits.email) {
    errors.email = "Enter an email address in the form name@example.com.";
  }

  if (!subject) errors.subject = "Enter a subject.";
  else if (subject.length > limits.subject) errors.subject = `Use ${limits.subject} characters or fewer.`;

  if (!message) errors.message = "Enter your message.";
  else if (message.length > limits.message) errors.message = `Use ${limits.message} characters or fewer.`;

  if (Object.keys(errors).length > 0) {
    return { status: "invalid", errors };
  }

  return { status: "undelivered", errors: {} };
}
