import { PageFrame, PageIntro, Panel } from "@epelawa/ui";
import CapabilityPicker from "../../../components/roles-capability-picker";
import { CAPABILITY_GROUPS, type CapabilityGroup } from "../../../lib/capability-groups";
import { createStaffClient } from "../../../lib/supabase";
import { assignRole, deleteRole, saveRole } from "./actions";
import styles from "./roles.module.css";

import ConfirmSubmit from "../../../components/confirm-submit";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Role = { id: string; name: string; description: string | null };
type Capability = { key: string; description: string | null };
type DirectoryEntry = { user_id: string; email: string; email_confirmed_at: string | null; is_active: boolean };
type Assignment = { user_id: string; role_id: string };
type RoleCapability = { role_id: string; capability: string };

function mergeGroups(catalogue: Capability[]): CapabilityGroup[] {
  const known = new Set(CAPABILITY_GROUPS.flatMap((group) => group.capabilities.map((item) => item.key)));
  const extra = catalogue
    .filter((item) => !known.has(item.key))
    .map((item) => ({ key: item.key, label: item.description || item.key }));
  if (extra.length > 0) {
    return [...CAPABILITY_GROUPS, { label: "Other", capabilities: extra }];
  }
  return CAPABILITY_GROUPS;
}

export default async function RolesPage() {
  const denied = (
    <PageFrame>
      <PageIntro
        eyebrow="Access control"
        title="Roles"
        description="Role management requires the primary administrator or the configured role-management capability."
      />
    </PageFrame>
  );
  const db = await createStaffClient();
  const { data: allowed, error: authError } = await db.rpc("staff_roles_authorized");
  if (authError || allowed !== true) {
    return denied;
  }

  const [rolesResult, capsResult, directoryResult, assignmentsResult, roleCapsResult] = await Promise.all([
    db.from("staff_roles").select("id,name,description").order("name").limit(100),
    db.from("capabilities").select("key,description").order("key").limit(100),
    db.rpc("staff_role_staff_directory"),
    db.from("staff_role_assignments").select("user_id,role_id").limit(500),
    db.from("staff_role_capabilities").select("role_id,capability").limit(1000),
  ]);

  const roles = (rolesResult.data ?? []) as Role[];
  const capabilities = (capsResult.data ?? []) as Capability[];
  const directory = (directoryResult.data ?? []) as DirectoryEntry[];
  const assignments = (assignmentsResult.data ?? []) as Assignment[];
  const roleCaps = (roleCapsResult.data ?? []) as RoleCapability[];
  const groups = mergeGroups(capabilities);

  return (
    <PageFrame className="ui-stack">
      <PageIntro
        eyebrow="Access control"
        title="Roles"
        description="Create configurable staff roles, then assign them to staff profiles. Effective access is evaluated by the database on every protected request."
      />
      {rolesResult.error || capsResult.error ? (
        <Panel role="alert"><p>Role data is unavailable until the reviewed database migration is applied.</p></Panel>
      ) : null}

      <Panel className="ui-stack-sm">
        <h2>Create a role</h2>
        <form action={saveRole} className="ui-stack-sm">
          <div className="ui-form-grid">
            <div className="ui-field"><label className="label" htmlFor="role-new-name">Role name</label><input className="input" id="role-new-name" name="name" required maxLength={80} /></div>
            <div className="ui-field"><label className="label" htmlFor="role-new-description">Description</label><input className="input" id="role-new-description" name="description" maxLength={500} /></div>
          </div>
          <fieldset className={styles.capabilities}>
            <legend>Capabilities</legend>
            <CapabilityPicker groups={groups} selected={[]} />
          </fieldset>
          <div className="ui-actions"><button className="btn-primary" type="submit">Create role</button></div>
        </form>
      </Panel>

      {roles.map((role) => {
        const granted = roleCaps.filter((item) => item.role_id === role.id).map((item) => item.capability);
        return (
          <Panel key={role.id} className="ui-stack-sm">
            <h2>{role.name}</h2>
            {role.description ? <p className="ui-muted">{role.description}</p> : null}
            <form action={saveRole} className="ui-stack-sm">
              <input type="hidden" name="id" value={role.id} />
              <div className="ui-form-grid">
                <div className="ui-field"><label className="label" htmlFor={`role-name-${role.id}`}>Role name</label><input className="input" id={`role-name-${role.id}`} name="name" required maxLength={80} defaultValue={role.name} /></div>
                <div className="ui-field"><label className="label" htmlFor={`role-description-${role.id}`}>Description</label><input className="input" id={`role-description-${role.id}`} name="description" maxLength={500} defaultValue={role.description ?? ""} /></div>
              </div>
              <fieldset className={styles.capabilities}>
                <legend>Capabilities</legend>
                <CapabilityPicker groups={groups} selected={granted} />
              </fieldset>
              <div className="ui-actions"><button className="btn-primary" type="submit">Save role</button></div>
            </form>
            <form action={deleteRole}>
              <input type="hidden" name="id" value={role.id} />
              <ConfirmSubmit className="btn-secondary" message={"Delete the role \""+role.name+"\"? Staff members will lose its access immediately. This cannot be undone."}>Delete role</ConfirmSubmit>
            </form>

            <h3>Staff assignments</h3>
            {directory.length === 0 ? <p className="ui-muted">No staff profiles found.</p> : directory.map((person) => {
              const assigned = assignments.some((item) => item.user_id === person.user_id && item.role_id === role.id);
              return (
                <form key={`${person.user_id}-${role.id}`} action={assignRole} className="ui-row">
                  <input type="hidden" name="user_id" value={person.user_id} />
                  <input type="hidden" name="role_id" value={role.id} />
                  <input type="hidden" name="assigned" value={String(!assigned)} />
                  <span>
                    {person.email}
                    {!person.email_confirmed_at ? " · email unverified" : ""}
                    {!person.is_active ? " · inactive" : ""}
                  </span>
                  <button className="btn-secondary" type="submit">{assigned ? "Remove role" : "Assign role"}</button>
                </form>
              );
            })}
          </Panel>
        );
      })}
    </PageFrame>
  );
}
