"use server";
import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../lib/supabase";
import { CAPABILITIES, mayManageUsers, safeGrant } from "../../../lib/user-management";

const PAGE_SIZE = 25;

type AuthUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  banned_until?: string | null;
};

function serviceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("User management is unavailable: server configuration is incomplete.");
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function authorize() {
  const db = await createClient();
  const [authResult, staffResult, grantResult] = await Promise.all([
    db.auth.getUser(),
    db.from("staff_profiles").select("is_active").maybeSingle(),
    db.rpc("has_capability", { p_capability: "staff.manage" }),
  ]);
  const user = authResult.data.user;
  if (
    authResult.error || staffResult.error || grantResult.error ||
    !mayManageUsers(user?.email, Boolean(user?.email_confirmed_at), staffResult.data?.is_active === true,
      grantResult.data === true ? ["staff.manage"] : [])
  ) {
    throw new Error("Not authorized.");
  }
  return db;
}

function publicUser(user: AuthUser, profiles: any[], grants: any[]) {
  const profile = profiles.find((candidate) => candidate.user_id === user.id);
  const banned = Boolean(user.banned_until && new Date(user.banned_until).getTime() > Date.now());
  return {
    id: user.id,
    email: user.email ?? "(no email)",
    isStaff: Boolean(profile),
    active: profile?.is_active === true,
    emailConfirmed: Boolean(user.email_confirmed_at),
    status: banned ? "banned" : "active",
    capabilities: grants.filter((grant) => grant.user_id === user.id).map((grant) => grant.capability),
  };
}

async function decorateUsers(admin: any, users: AuthUser[]) {
  if (!users.length) return [];
  const ids = users.map((user) => user.id);
  const [profilesResult, grantsResult] = await Promise.all([
    admin.from("staff_profiles").select("user_id,is_active").in("user_id", ids),
    admin.from("staff_capability_grants").select("user_id,capability").in("user_id", ids).is("revoked_at", null),
  ]);
  if (profilesResult.error || grantsResult.error) throw new Error("Unable to load staff access details.");
  return users.map((user) => publicUser(user, profilesResult.data ?? [], grantsResult.data ?? []));
}

export async function listUsers(query = "", page = 1) {
  await authorize();
  const admin = serviceClient();
  const normalizedQuery = String(query ?? "").trim().toLowerCase();
  const requestedPage = Math.max(1, Math.floor(Number(page) || 1));

  if (normalizedQuery) {
    // Auth Admin has no email filter; scan sequentially to avoid request bursts.
    const matching: AuthUser[] = [];
    for (let pageNumber = 1; ; pageNumber += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page: pageNumber, perPage: PAGE_SIZE });
      if (error) throw new Error("Unable to search all accounts.");
      matching.push(...data.users.filter((user: AuthUser) => (user.email ?? "").toLowerCase().includes(normalizedQuery)));
      if (data.users.length < PAGE_SIZE) break;
    }
    const start = (requestedPage - 1) * PAGE_SIZE;
    return {
      users: await decorateUsers(admin, matching.slice(start, start + PAGE_SIZE)),
      page: requestedPage,
      hasNext: start + PAGE_SIZE < matching.length,
    };
  }

  const { data, error } = await admin.auth.admin.listUsers({ page: requestedPage, perPage: PAGE_SIZE });
  if (error) throw new Error("Unable to load accounts.");
  return { users: await decorateUsers(admin, data.users), page: requestedPage, hasNext: data.users.length === PAGE_SIZE };
}

export async function getDirectoryExtras() {
  const db = await authorize();
  const { data: canReadAudit, error: auditPermissionError } = await db.rpc("has_capability", { p_capability: "audit.read" });
  const admin = serviceClient();
  const [catalogueResult, auditResult] = await Promise.all([
    admin.from("capabilities").select("key,description").in("key", [...CAPABILITIES]),
    !auditPermissionError && canReadAudit === true
      ? db.from("audit_events").select("action,created_at,resource_id,metadata")
        .eq("actor_kind", "staff")
        .in("action", ["staff.grants_change", "staff.user_restore", "staff.user_deactivate"])
        .order("created_at", { ascending: false })
        .limit(10)
      : Promise.resolve({ data: null, error: { message: "audit.read capability required" } }),
  ]);
  const auditEvents = (auditResult.data ?? []).map((event: any) => {
    const metadata = event.metadata && typeof event.metadata === "object" ? event.metadata : {};
    const capabilities = Array.isArray(metadata.capabilities)
      ? metadata.capabilities.filter((key: string) => CAPABILITIES.includes(key as (typeof CAPABILITIES)[number]))
      : [];
    return { action: event.action, created_at: event.created_at, resource_id: event.resource_id, capabilities };
  });
  return {
    descriptions: catalogueResult.error
      ? {}
      : Object.fromEntries((catalogueResult.data ?? []).map((item: any) => [item.key, item.description])),
    auditAvailable: !auditPermissionError && canReadAudit === true && !auditResult.error,
    auditEvents,
  };
}

function submittedCapabilities(form: FormData) {
  return form.getAll("capability").map(String);
}

export async function changeCapabilities(form: FormData) {
  const db = await authorize();
  const userId = String(form.get("id") ?? "");
  const admin = serviceClient();
  const { data: targetResult, error: targetError } = await admin.auth.admin.getUserById(userId);
  const target = targetResult.user;
  if (targetError || !target?.email) throw new Error("Account not found.");

  const requested = submittedCapabilities(form);
  const capabilities = safeGrant(target.email, requested);
  if (capabilities.some((capability) => !CAPABILITIES.includes(capability as (typeof CAPABILITIES)[number]))) {
    throw new Error("Invalid capability.");
  }

  const { data: profile, error: profileLookupError } = await admin.from("staff_profiles")
    .select("user_id").eq("user_id", userId).maybeSingle();
  if (profileLookupError) throw new Error("Unable to inspect staff profile.");
  if (!profile && capabilities.length > 0) {
    const { error } = await admin.from("staff_profiles").upsert(
      { user_id: userId, is_active: true, must_change_password: false },
      { onConflict: "user_id" },
    );
    if (error) throw new Error("Staff profile could not be created; no capabilities were granted.");
  }
  if (profile || capabilities.length > 0) {
    const { error } = await db.rpc("staff_user_set_grants", { p_user_id: userId, p_capabilities: capabilities });
    if (error) throw new Error("Capability update was rejected.");
  }
  revalidatePath("/admin/users");
}

export async function setUserActive(form: FormData) {
  const db = await authorize();
  const userId = String(form.get("id") ?? "");
  const active = String(form.get("active")) === "true";
  const { error } = await db.rpc("staff_user_set_active", { p_user_id: userId, p_active: active });
  if (error) throw new Error("Staff status update was rejected.");
  revalidatePath("/admin/users");
}

export async function inviteUser(form: FormData) {
  const db = await authorize();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");

  const admin = serviceClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email);
  if (error || !data.user) {
    throw new Error("Supabase Auth did not confirm the invitation request. Check Auth SMTP and the directory before retrying.");
  }

  const capabilities = safeGrant(email, submittedCapabilities(form));
  if (capabilities.length > 0) {
    const { error: profileError } = await admin.from("staff_profiles").upsert(
      { user_id: data.user.id, is_active: true, must_change_password: false },
      { onConflict: "user_id" },
    );
    if (profileError) {
      revalidatePath("/admin/users");
      return { email, staffAccessAssigned: false, warning: "Supabase Auth accepted the invitation, but staff-profile setup failed. The account has no staff role; review it before retrying." };
    }

    const { error: grantError } = await db.rpc("staff_user_set_grants", {
      p_user_id: data.user.id,
      p_capabilities: capabilities,
    });
    if (grantError) {
      revalidatePath("/admin/users");
      return { email, staffAccessAssigned: false, warning: "Supabase Auth accepted the invitation, but capability setup failed. The invited account has no elevated capabilities; review and retry authorization." };
    }
  }

  revalidatePath("/admin/users");
  return { email, staffAccessAssigned: capabilities.length > 0, warning: "" };
}
