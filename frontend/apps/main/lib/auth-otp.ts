export type AuthState = { status: "idle" | "error" | "notice"; message: string; fieldErrors?: Partial<Record<"email" | "password" | "displayName" | "handle", string>> };
export type EmailOtpOutcome = AuthState | { redirectTo: "/auth/complete" };

type SupabaseOtpClient = {
  auth: {
    resend: (input: {
      type: "signup";
      email: string;
      options: { emailRedirectTo: string };
    }) => Promise<{ error: unknown | null }>;
    verifyOtp: (input: {
      email: string;
      token: string;
      type: "signup";
    }) => Promise<{ error: unknown | null }>;
  };
};

type CreateOtpClient = () => Promise<SupabaseOtpClient>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const invalidEmailMessage = "Enter a valid email address.";
const resendErrorMessage = "We couldn’t request a fresh verification message right now. Try again later.";
const resendNoticeMessage = "If an account is awaiting verification, Supabase Auth may send a fresh email. Delivery depends on this project’s email configuration.";

function field(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function validEmail(email: string): boolean {
  return email.length <= 254 && emailPattern.test(email);
}

export async function handleResendSignupVerification(
  data: FormData,
  createClient: CreateOtpClient,
  emailRedirectTo: string,
): Promise<AuthState> {
  const email = field(data, "email").toLowerCase();
  if (!validEmail(email)) return { status: "error", message: invalidEmailMessage };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo },
    });
    if (error) return { status: "error", message: resendErrorMessage };
    return { status: "notice", message: resendNoticeMessage };
  } catch {
    return { status: "error", message: resendErrorMessage };
  }
}

export async function handleVerifyEmailOtp(
  data: FormData,
  createClient: CreateOtpClient,
  emailRedirectTo: string,
): Promise<EmailOtpOutcome> {
  if (field(data, "intent") === "resend") {
    return handleResendSignupVerification(data, createClient, emailRedirectTo);
  }

  const email = field(data, "email").toLowerCase();
  const token = field(data, "token").replace(/\s/g, "");
  if (!validEmail(email) || !/^\d{6,8}$/.test(token)) {
    return { status: "error", message: "Enter the email address and verification code from your message." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });
    if (error) {
      return { status: "error", message: "That code could not be verified. Request a new verification email and try again." };
    }
    return { redirectTo: "/auth/complete" };
  } catch {
    return { status: "error", message: "We couldn’t complete that request. Check your details and try again." };
  }
}
