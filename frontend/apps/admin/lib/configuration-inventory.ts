/** Deliberate allowlist only: never enumerate process.env or return values. */
type Spec = { name: string; group: string; guide: string; optional?: boolean };
export const CONFIGURATION: readonly Spec[] = [
  { name: "NEXT_PUBLIC_SITE_URL", group: "Site & database", guide: "Set the canonical HTTPS site origin in Vercel, without a path." },
  { name: "NEXT_PUBLIC_SUPABASE_URL", group: "Site & database", guide: "Copy the project URL from Supabase → Project Settings → API." },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", group: "Site & database", guide: "Copy the public anon key from Supabase → Project Settings → API. The public browser client currently expects this name.", optional: true },
  { name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", group: "Site & database", guide: "Copy the publishable key from Supabase → Project Settings → API; use the anon key if required by other clients.", optional: true },
  { name: "SUPABASE_ANON_KEY", group: "Site & database", guide: "Public anon key used by some server-side clients. Copy it from Supabase → Project Settings → API if required.", optional: true },
  { name: "SUPABASE_URL", group: "Site & database", guide: "Set the project URL for the server-side staff client." },
  { name: "SUPABASE_PUBLISHABLE_KEY", group: "Site & database", guide: "Copy a publishable key from Supabase → Project Settings → API for the staff client." },
  { name: "SUPABASE_SERVICE_ROLE_KEY", group: "Site & database", guide: "For the disabled newsletter workflow only, obtain the server-only service role key from Supabase → Project Settings → API. Never share it.", optional: true },
  { name: "AUTH_EMAIL_FROM", group: "Email", guide: "Set a sender address approved for your Gmail account (or verified Resend domain)." },
  { name: "AUTH_GMAIL_USER", group: "Email", guide: "Set the full Gmail address used for SMTP. Gmail is selected when its credentials are present." },
  { name: "AUTH_GMAIL_APP_PASSWORD", group: "Email", guide: "Enable Google two-step verification, then create an app password in Google Account → Security → App passwords. Store it as a sensitive Vercel variable." },
  { name: "AUTH_GMAIL_SMTP_HOST", group: "Email", guide: "Gmail SMTP host is smtp.gmail.com. If absent the app defaults to that host; arbitrary hosts are rejected.", optional: true },
  { name: "AUTH_GMAIL_SMTP_PORT", group: "Email", guide: "Use 465 for implicit TLS or 587 for required STARTTLS; the default is 465.", optional: true },
  { name: "AUTH_EMAIL_HOOK_SECRET", group: "Email", guide: "For the custom Auth hook, set the matching Supabase Standard Webhooks signing secret. Generate 32 random bytes locally, base64 encode and prefix whsec_. Never post it in chat." },
  { name: "RESEND_API_KEY", group: "Email", guide: "Optional alternative: create an API key in Resend, verify a sender domain and remove both Gmail credentials to select Resend.", optional: true },
  { name: "ENQUIRY_INTAKE_ENABLED", group: "Forms", guide: "Leave unset until private staff access, monitored Gmail alerts, retention and delivery are ready.", optional: true },
  { name: "FORM_RATE_SECRET", group: "Forms", guide: "For newsletter intake, generate a separate random secret of at least 32 bytes and store it as sensitive. Do not reuse the Auth hook secret." },
  { name: "NEWSLETTER_SIGNUP_ENABLED", group: "Forms", guide: "Leave unset until rate limiting, retention, monitoring and real inbox tests are complete. A value of true alone does not establish readiness.", optional: true },
  { name: "NEXT_PUBLIC_R2_PUBLIC_BASE_URL", group: "Storage", guide: "Use the authorized public HTTPS base URL for your R2 bucket when public media is configured.", optional: true },
  { name: "R2_ACCOUNT_ID", group: "Storage", guide: "Find the account ID in the Cloudflare dashboard for the relevant R2 account.", optional: true },
  { name: "R2_BUCKET_PUBLIC", group: "Storage", guide: "Enter the public R2 bucket name from Cloudflare R2.", optional: true },
  { name: "R2_BUCKET_PRIVATE", group: "Storage", guide: "Enter the private R2 bucket name from Cloudflare R2.", optional: true },
  { name: "NEXT_PUBLIC_WEB_PUSH_ENABLED", group: "Web push", guide: "Optional web-push feature flag. Enable only after push configuration and delivery are verified.", optional: true },
  { name: "NEXT_PUBLIC_VAPID_PUBLIC_KEY", group: "Web push", guide: "Set the public half of the matched VAPID key pair for the browser when web push is enabled.", optional: true },
  { name: "VAPID_PUBLIC_KEY", group: "Web push", guide: "Generate a matched VAPID key pair for web push; set the public key here.", optional: true },
  { name: "VAPID_PRIVATE_KEY", group: "Web push", guide: "Store the private half of the same VAPID key pair as a sensitive server-only variable.", optional: true },
  { name: "RADIO_STREAM_URL", group: "Radio", guide: "Set the authorized direct HTTPS stream URL after verifying broadcasting rights.", optional: true },
  { name: "NAIJA_RADIO_API_KEY", group: "Radio", guide: "If using the Naija Radio API, obtain its key from the provider.", optional: true },
  { name: "ALLOW_INDEXING", group: "Operations", guide: "Optional indexing override: true or false. If absent, the site applies its origin-based default.", optional: true },
  { name: "CRON_SECRET", group: "Operations", guide: "Generate a random secret and configure it as a sensitive Vercel environment variable for scheduled jobs.", optional: true },
];
export type ConfigurationStatus = Spec & { status: "present" | "missing" | "sample" };
export function configurationStatus(env: NodeJS.ProcessEnv): ConfigurationStatus[] {
  return CONFIGURATION.map(item => {
    const value = env[item.name]?.trim();
    const status = !value ? "missing" : /^(<.*>|replace[-_ ]|your[-_ ]|example[-_ ])/i.test(value) || /@example\.invalid\b/i.test(value) ? "sample" : "present";
    return { ...item, status };
  });
}
