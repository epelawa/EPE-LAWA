-- Create a Who-is-Who profile and its achievements in one atomic staff transition.
-- This avoids leaving a draft without its submitted achievements if a follow-up RPC fails.
-- The staff console needs revision for compare-and-swap actions; existing RLS still limits rows.
grant select (revision) on table public.people to authenticated;

create or replace function public.people_create_with_achievements(
  p_full_name text,
  p_preferred_name text,
  p_community text,
  p_community_note text,
  p_biography text,
  p_is_deceased boolean,
  p_portrait_key text,
  p_portrait_alt text,
  p_portrait_credit text,
  p_achievements text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := gen_random_uuid();
  v_base text;
  v_slug text;
  v_n integer := 1;
  v_achievements text := nullif(btrim(p_achievements), '');
begin
  perform public.require_capability('people.manage');

  if p_achievements is not null and char_length(p_achievements) > 12000 then
    raise exception using errcode = '22023', message = 'achievements_too_long';
  end if;

  v_base := coalesce(public.slugify(p_full_name), 'person');
  v_slug := v_base;

  loop
    exit when not exists (select 1 from public.people p where p.slug = v_slug);
    v_n := v_n + 1;
    if v_n > 50 then
      v_slug := v_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
      exit;
    end if;
    v_slug := v_base || '-' || v_n::text;
  end loop;

  insert into public.people (
    id, slug, full_name, preferred_name, community, community_note, biography,
    is_deceased, portrait_key, portrait_alt, portrait_credit, achievements, status
  ) values (
    v_id, v_slug, btrim(p_full_name), p_preferred_name, p_community, p_community_note,
    p_biography, coalesce(p_is_deceased, false), p_portrait_key, p_portrait_alt,
    p_portrait_credit, v_achievements, 'draft'
  );

  perform public.audit_event(
    'staff', 'people.create', 'person', v_id, 'success',
    jsonb_build_object(
      'full_name', btrim(p_full_name),
      'slug', v_slug,
      'achievements_present', v_achievements is not null
    )
  );

  return v_id;
end;
$$;

revoke all on function public.people_create_with_achievements(text,text,text,text,text,boolean,text,text,text,text) from public;
grant execute on function public.people_create_with_achievements(text,text,text,text,text,boolean,text,text,text,text) to authenticated;
