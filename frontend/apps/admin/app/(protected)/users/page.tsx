import { PageFrame, PageIntro, Panel } from "@epelawa/ui";
import { createClient } from "../../../lib/supabase";
import { inviteStaff, setStaffActive } from "./actions";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function StaffUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const search = q.trim().slice(0, 100);
  const db = await createClient();
  const { data: authorized, error: authError } = await db.rpc("staff_roles_authorized");
  if (authError || authorized !== true) return <PageFrame><PageIntro eyebrow="Access control" title="Staff users" description="This directory is restricted to the verified primary administrator." /></PageFrame>;
  const { data, error } = await db.rpc("staff_role_staff_directory", { p_search: search, p_limit: 50 });
  const configured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.ADMIN_ORIGIN);
  const staff = (data ?? []) as {user_id:string;email:string;email_verified:boolean;is_active:boolean;role_ids:string[]}[];
  const { data: authData } = await db.auth.getUser();
  const currentUserId = authData.user?.id;
  return <PageFrame><PageIntro eyebrow="Access control" title="Staff users" description="Staff-only accounts and access state. Member accounts and member data are not included." />
    <Panel><h2>Invite staff</h2>{configured ? <form action={inviteStaff} className="ui-row"><label>Email address<input name="email" type="email" required maxLength={254} autoComplete="email" /></label><button type="submit">Send invitation</button></form> : <p role="status">Invitations unavailable — server-only Supabase invitation configuration is missing. No invite has been sent.</p>}</Panel>
    <Panel><h2>Staff directory</h2><form method="get" className="ui-row"><label htmlFor="staff-search">Search email</label><input id="staff-search" name="q" defaultValue={search} maxLength={100} /><button type="submit">Search</button></form>
    {error ? <p role="status">Staff directory unavailable until the reviewed role migration is approved and applied.</p> : staff.length ? <ul>{staff.map(user=><li key={user.user_id} className="ui-row"><span><strong>{user.email}</strong> · {user.email_verified ? "Verified" : "Unverified"} · {user.is_active ? "Active" : "Inactive"}</span><form action={setStaffActive}><input type="hidden" name="user_id" value={user.user_id}/><input type="hidden" name="active" value={String(!user.is_active)}/><button type="submit" disabled={user.user_id === currentUserId}>{user.is_active ? "Deactivate" : "Activate"}</button></form></li>)}</ul> : <p>No staff accounts found.</p>}</Panel>
  </PageFrame>;
}
