-- Additive repair for member profile completion after the member_identity schema
-- is installed. Profile creation is limited to the signed-in, email-verified
-- auth user and derives identity only from that user's signup metadata.
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
begin
  if v_user_id is null then
    return false;
  end if;

  select lower(btrim(coalesce(u.raw_user_meta_data ->> 'handle', ''))),
         btrim(coalesce(u.raw_user_meta_data ->> 'display_name', ''))
    into v_handle, v_display_name
    from auth.users u
   where u.id = v_user_id
     and u.email_confirmed_at is not null;
  if not found
     or v_handle !~ '^[a-z0-9_]{3,24}$'
     or char_length(v_display_name) not between 1 and 60
     or public.handle_is_reserved(v_handle) then
    return false;
  end if;

  insert into public.profiles (user_id, handle, display_name)
  values (v_user_id, v_handle, v_display_name)
  on conflict (user_id) do nothing;
  return exists (
    select 1 from public.profiles p
    where p.user_id = v_user_id and p.deleted_at is null
  );
exception when unique_violation then
  -- A globally taken handle is not a successful bootstrap.
  return false;
end;
$$;

revoke all on function public.bootstrap_verified_member_profile() from public, anon;
grant execute on function public.bootstrap_verified_member_profile() to authenticated;
