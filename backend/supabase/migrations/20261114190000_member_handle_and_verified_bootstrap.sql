-- Source-only, forward-only gate: requires public.profiles, public.handle_is_reserved,
-- public.audit_event and public.audit_events from the approved member identity/audit schema.
-- Do not apply until the production schema inventory and all prerequisites are verified.

create or replace function public.member_handle_availability(p_handle text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_handle text := lower(btrim(coalesce(p_handle, '')));
begin
  if v_handle !~ '^[a-z0-9_]{3,24}$' or public.handle_is_reserved(v_handle) then
    return 'unavailable';
  end if;
  if exists (select 1 from public.profiles p where p.handle::text = v_handle) then
    return 'taken';
  end if;
  return 'available';
end;
$$;
revoke all on function public.member_handle_availability(text) from public;
grant execute on function public.member_handle_availability(text) to anon, authenticated;

-- Mirrors feat/member-profile-schema-repair-20261114's verified, user-scoped
-- bootstrap RPC, with an audit row emitted only when this call inserts a profile.
create or replace function public.bootstrap_verified_member_profile()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_handle text;
  v_display_name text;
  v_inserted integer := 0;
begin
  if v_user_id is null then return false; end if;
  select lower(btrim(coalesce(u.raw_user_meta_data ->> 'handle', ''))),
         btrim(coalesce(u.raw_user_meta_data ->> 'display_name', ''))
    into v_handle, v_display_name
    from auth.users u
   where u.id = v_user_id and u.email_confirmed_at is not null;
  if not found
     or v_handle !~ '^[a-z0-9_]{3,24}$'
     or char_length(v_display_name) not between 1 and 60
     or public.handle_is_reserved(v_handle) then
    return false;
  end if;
  insert into public.profiles (user_id, handle, display_name)
  values (v_user_id, v_handle, v_display_name)
  on conflict (user_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 1 then
    perform public.audit_event(
      'member', 'member.profile_bootstrap', 'profile', v_user_id, 'success',
      jsonb_build_object('source', 'verified_auth_bootstrap')
    );
  end if;
  return exists (
    select 1 from public.profiles p
     where p.user_id = v_user_id and p.deleted_at is null
  );
exception when unique_violation then
  -- Preserve the existing unique handle constraint as the race authority.
  return false;
end;
$$;
revoke all on function public.bootstrap_verified_member_profile() from public, anon;
grant execute on function public.bootstrap_verified_member_profile() to authenticated;
