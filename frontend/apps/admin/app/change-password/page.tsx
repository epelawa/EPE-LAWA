import { PageFrame, PageIntro, Panel } from "@epelawa/ui";
import { updatePassword } from "./actions";

export const dynamic = "force-dynamic";

export default function ChangePasswordPage() {
  return (
    <PageFrame>
      <PageIntro
        eyebrow="Account security"
        title="Change your password"
        description="A new password is required before continuing to the admin workspace."
      />
      <Panel>
        <form action={updatePassword}>
          <label htmlFor="currentPassword">Current password</label>
          <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
          <label htmlFor="password">Different new password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required />
          <button>Update password</button>
        </form>
      </Panel>
    </PageFrame>
  );
}
