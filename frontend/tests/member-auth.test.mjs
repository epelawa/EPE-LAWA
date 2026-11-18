import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../apps/main/app/", import.meta.url);

test("member auth uses the public Supabase client and validates profile/session through member schema", async () => {
  const actions = await readFile(new URL("auth/actions.ts", root), "utf8");
  const dashboard = await readFile(new URL("dashboard/page.tsx", root), "utf8");
  const callback = await readFile(new URL("auth/callback/route.ts", root), "utf8");
  const serverClient = await readFile(new URL("../lib/supabase.ts", root), "utf8");
  assert.match(actions, /signUp\(/);
  assert.match(actions, /signInWithPassword/);
  assert.match(actions, /resetPasswordForEmail/);
  assert.match(actions, /updateUser\(\{ password \}\)/);
  assert.match(actions, /function passwordField\(data: FormData\)[\s\S]*?return typeof value === "string" \? value : ""/);
  assert.equal((actions.match(/const password = passwordField\(data\);/g) ?? []).length, 3, "signup, sign-in and password update must preserve exact passwords");
  assert.doesNotMatch(actions + dashboard, /SERVICE_ROLE|service_role/i);
  assert.match(dashboard, /email_confirmed_at/);
  assert.match(dashboard, /rpc\("bootstrap_verified_member_profile"\)/);
  assert.doesNotMatch(dashboard, /from\("profiles"\)\.insert/);
  assert.match(callback, /exchangeCodeForSession/);
  assert.match(callback, /safeAuthNext\(params\.get\("next"\)\)/);
  assert.match(serverClient, /createServerClient/);
  assert.match(serverClient, /cookieStore\.set/);
  assert.match(dashboard, /supabase\.auth\.getUser\(\)/);
});

test("signup remains guided while member sign-in is one accessible screen", async () => {
  const forms = await readFile(new URL("auth/auth-forms.tsx", root), "utf8");
  const actions = await readFile(new URL("auth/actions.ts", root), "utf8");
  const resend = await readFile(new URL("auth/resend-verification-form.tsx", root), "utf8");
  const signupPage = await readFile(new URL("auth/page.tsx", root), "utf8");
  const loginPage = await readFile(new URL("login/page.tsx", root), "utf8");
  const recoveryPage = await readFile(new URL("forgot-password/page.tsx", root), "utf8");
  const newPasswordPage = await readFile(new URL("auth/new-password/page.tsx", root), "utf8");
  const signIn = forms.match(/export function SignInForm\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";

  assert.match(forms, /useAuthSteps\(4,/);
  assert.doesNotMatch(forms, /useAuthSteps\(2\)/);
  assert.ok(signIn, "a single public sign-in component exists");
  assert.doesNotMatch(signIn, /useAuthSteps|StepProgress|StepActions|auth-step/);
  assert.match(signIn, /id="login-email"/);
  assert.match(signIn, /id="login-password"/);
  assert.match(signIn, /<GoogleSignInUnavailable \/>/);
  assert.match(signIn, /draggable=\{false\}/);
  assert.match(signIn, /onDragStart=\{\(event\) => event\.preventDefault\(\)\}/);
  assert.match(signIn, /className="auth-submit" type="submit"/);
  assert.match(forms, /data-total=\{total\}/);
  assert.match(forms, /data-enhanced=\{flow\.enhanced\}/);
  assert.match(forms, /onSubmit=\{flow\.onSubmit\}/);
  assert.match(forms, /hidden=\{flow\.enhanced && flow\.step !== 1\}/);
  assert.match(forms, /field\.reportValidity\(\)/);
  assert.match(forms, /focus\(\{ preventScroll: true \}\)/);
  assert.match(forms, /aria-live="polite"/);
  assert.match(forms, /role=\{state\.status === "error" \? "alert" : "status"\}/);
  assert.match(forms, /placeholder="name@example\.com"/);
  assert.match(forms, /placeholder="your_handle"/);
  assert.match(forms, /placeholder="At least 10 characters"/);
  assert.match(forms, /Google sign-in/);
  assert.match(forms, /Coming Soon/);
  assert.match(forms, /type=\{visible \? "text" : "password"\}/);
  assert.match(forms, /aria-label=\{visible \? "Hide password" : "Show password"\}/);
  assert.match(forms, /aria-pressed=\{visible\}/);
  assert.match(forms, /aria-controls=\{id\}/);
  assert.match(forms, /className="auth-provider__button" type="button" disabled aria-disabled="true"/);
  assert.match(forms, /!flow\.enhanced \|\| flow\.step === 1 \? <GoogleSignInUnavailable \/>/);
  assert.match(forms, /function SignUpForm\(\)[\s\S]*GoogleSignInUnavailable/);
  assert.match(actions, /If an account exists for that address/);
  assert.match(actions, /Enter a valid email address\./);
  assert.match(actions, /Enter your password\./);
  assert.match(actions, /Choose a handle with 3–24 letters, numbers or underscores\./);
  assert.match(actions, /if \(error\) return \{ status: "error", message: genericError \}/);
  assert.match(actions, /const availability = await checkHandleAvailability\(handle\)/);
  assert.match(signupPage, /href="\/terms"/);
  assert.match(signupPage, /href="\/privacy"/);
  assert.match(signupPage, /href="\/login"/);
  assert.match(loginPage, /href="\/auth"/);
  assert.match(loginPage, /href="\/forgot-password"/);
  assert.match(recoveryPage, /href="\/login"/);
  assert.match(newPasswordPage, /href="\/forgot-password"/);
  assert.match(newPasswordPage, /href="\/login"/);

  assert.match(resend, /htmlFor="verification-email"/);
  assert.match(resend, /placeholder="name@example\.com"/);
  assert.match(resend, /aria-describedby="verification-email-help"/);
});

test("email verification uses a branded noindex OTP route and Supabase signup-code actions", async () => {
  const verifyPage = await readFile(new URL("auth/verify/page.tsx", root), "utf8");
  const forms = await readFile(new URL("auth/auth-forms.tsx", root), "utf8");
  const actions = await readFile(new URL("auth/actions.ts", root), "utf8");
  const otpLogic = await readFile(new URL("../lib/auth-otp.ts", root), "utf8");

  assert.match(verifyPage, /AccountShell/);
  assert.match(verifyPage, /VerificationForm/);
  assert.match(verifyPage, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
  assert.match(forms, /id="verify-email" name="email" type="email"/);
  assert.match(forms, /autoComplete="one-time-code"/);
  assert.match(forms, /name="intent" value="verify"/);
  assert.match(forms, /name="intent" value="resend" formNoValidate/);
  assert.match(forms, /one-time code and a secure link/);
  assert.match(actions, /handleVerifyEmailOtp\(data, createClient, authCallbackUrl\("\/dashboard"\)\)/);
  assert.match(actions, /redirect\(outcome\.redirectTo\)/);
  assert.match(otpLogic, /verifyOtp\(\{ email, token, type: "signup" \}\)/);
  assert.match(actions, /resendSignupVerification/);
  assert.match(otpLogic, /type: "signup"/);
  assert.match(actions, /authCallbackUrl\("\/dashboard"\)/);
  assert.match(otpLogic, /options: \{ emailRedirectTo \}/);
  assert.doesNotMatch(actions + otpLogic, /auth\/complete/);
  assert.doesNotMatch(actions, /SERVICE_ROLE|service_role/i);
});

test("transactional email templates use Supabase confirmation placeholder and no promotional content", async () => {
  const base = new URL("../../backend/supabase/templates/", import.meta.url);
  const confirmation = await readFile(new URL("confirmation.html", base), "utf8");
  assert.match(confirmation, /\{\{ \.Token \}\}/);
  assert.match(confirmation, /\{\{ \.ConfirmationURL \}\}/);
  assert.match(confirmation, /#294B91/);
  assert.match(confirmation, /#F1F4FA/);
  for (const name of ["confirmation.html", "recovery.html", "transactional.txt"]) {
    const text = await readFile(new URL(name, base), "utf8");
    assert.match(text, /\{\{ \.ConfirmationURL \}\}/);
    assert.doesNotMatch(text, /sale|discount|subscribe|newsletter/i);
  }
});

test("320px sign-in stays fixed without scroll/drag and keeps Google visibly disabled", async () => {
  const styles = await readFile(new URL("auth/auth.css", root), "utf8");
  const forms = await readFile(new URL("auth/auth-forms.tsx", root), "utf8");
  const shell = await readFile(new URL("../components/account-shell.tsx", root), "utf8");
  const staffForm = await readFile(new URL("../components/admin-login-form.tsx", root), "utf8");

  assert.match(shell, /fixedViewport \? " auth-page--fixed-viewport"/);
  assert.match(styles, /\.auth-page--fixed-viewport\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(styles, /\.auth-page--fixed-viewport\s*\{[^}]*overscroll-behavior:\s*none/s);
  assert.match(styles, /body:has\(\.auth-page--fixed-viewport\) \.site-main\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(forms, /function SignInForm\(\)[\s\S]*<GoogleSignInUnavailable \/>/);
  assert.match(forms, /className="auth-provider__button" type="button" disabled aria-disabled="true"/);
  assert.match(forms, /draggable=\{false\} onDragStart=\{\(event\) => event\.preventDefault\(\)\}/);
  assert.match(staffForm, /draggable=\{false\} onDragStart=\{\(event\) => event\.preventDefault\(\)\}/);
  assert.doesNotMatch(staffForm, /scrollHeight|scrollTop/);
});

test("auth provider errors are allowlisted, contextual, and never expose provider messages", async () => {
  const { mapAuthProviderError } = await import("../apps/main/app/auth/auth-error.ts");
  assert.equal(mapAuthProviderError({ code: "invalid_credentials", status: 400, message: "secret provider text" }, "signin"), "Email or password is incorrect. Try again or reset your password.");
  assert.match(mapAuthProviderError({ code: "email_not_confirmed", status: 400 }, "signin"), /Confirm your email/);
  assert.match(mapAuthProviderError({ code: "over_email_send_rate_limit", status: 429 }, "signup"), /wait a moment/);
  assert.match(mapAuthProviderError({ status: 500, message: "SMTP credentials leaked" }, "signup"), /Account setup or verification is temporarily unavailable/);
  assert.match(mapAuthProviderError({ name: "TypeError", message: "network details" }, "signin"), /temporarily unavailable/);
  assert.doesNotMatch(mapAuthProviderError({ code: "invalid_credentials", status: 400, message: "secret provider text" }, "signup"), /incorrect|secret provider text/);
  assert.doesNotMatch(mapAuthProviderError({ code: "unrecognized", status: 400, message: "do not show" }, "signin"), /do not show/);
});
