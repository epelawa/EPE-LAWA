export type AuthErrorContext = "signup" | "signin" | "recovery" | "other";

export type SafeAuthError = {
  code?: unknown;
  status?: unknown;
  name?: unknown;
};

const generic = "We couldn’t complete that request. Check your details and try again.";
const unavailable = "Sign-in is temporarily unavailable. Please try again later.";
const retry = "Too many attempts. Please wait a moment and try again.";

/** Map only stable provider codes/statuses; never surface provider-controlled messages. */
export function mapAuthProviderError(value: unknown, context: AuthErrorContext): string {
  const error: SafeAuthError = value && typeof value === "object" ? value as SafeAuthError : {};
  const code = typeof error.code === "string" ? error.code.toLowerCase() : "";
  const status = typeof error.status === "number" ? error.status : Number(error.status);

  if (status === 429 || code.includes("rate_limit") || code.includes("too_many_requests")) return retry;
  if (context === "signin" && code === "invalid_credentials") {
    return "Email or password is incorrect. Try again or reset your password.";
  }
  if (context === "signin" && code === "email_not_confirmed") {
    return "Confirm your email before signing in. Check your inbox or request a new verification email.";
  }
  if (status >= 500 || code === "fetch_error" || code === "network_error" || (error.name === "FetchError" || error.name === "TypeError")) {
    return context === "signup"
      ? "Account setup or verification is temporarily unavailable. Please try again later."
      : unavailable;
  }
  return generic;
}
