import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../apps/main/app/", import.meta.url);

test("member auth uses the public Supabase client and validates profile/session through member schema", async () => {
  const actions = await readFile(new URL("auth/actions.ts", root), "utf8");
  const complete = await readFile(new URL("auth/complete/page.tsx", root), "utf8");
  const callback = await readFile(new URL("auth/callback/route.ts", root), "utf8");
  assert.match(actions, /signUp\(/);
  assert.match(actions, /signInWithPassword/);
  assert.match(actions, /resetPasswordForEmail/);
  assert.match(actions, /updateUser\(\{ password \}\)/);
  assert.doesNotMatch(actions + complete, /SERVICE_ROLE|service_role/i);
  assert.match(complete, /email_confirmed_at/);
  assert.match(complete, /from\("profiles"\)\.insert/);
  assert.match(complete, /user_id: user\.id/);
  assert.match(callback, /exchangeCodeForSession/);
  assert.match(callback, /startsWith\("\/\/"\)/);
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

  assert.match(forms, /useAuthSteps\(4\)/);
  assert.doesNotMatch(forms, /useAuthSteps\(2\)/);
  assert.ok(signIn, "a single public sign-in component exists");
  assert.doesNotMatch(signIn, /useAuthSteps|StepProgress|StepActions|auth-step/);
  assert.match(signIn, /id="login-email"/);
  assert.match(signIn, /id="login-password"/);
  assert.match(signIn, /<GoogleSignInUnavailable \/>/);
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
  assert.match(actions, /If an account exists for that address/);
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

test("transactional email templates use Supabase confirmation placeholder and no promotional content", async () => {
  const base = new URL("../../backend/supabase/templates/", import.meta.url);
  for (const name of ["confirmation.html", "recovery.html", "transactional.txt"]) {
    const text = await readFile(new URL(name, base), "utf8");
    assert.match(text, /\{\{ \.ConfirmationURL \}\}/);
    assert.doesNotMatch(text, /sale|discount|subscribe|newsletter/i);
  }
});
