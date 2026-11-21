-- Editable site pages: staff can update the About and legal pages from the
-- private workspace, including photos for the About anchors/pioneers section.
-- Public visitors read the table through RLS; writes only happen through this
-- capability-guarded, audited RPC — there is no direct table write for clients.

begin;

create table if not exists public.site_pages (
  page text primary key check (page in ('about', 'privacy', 'terms', 'guidelines')),
  body text not null default '',
  photos jsonb not null default '[]'::jsonb,
  revision int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.site_pages enable row level security;

grant select on table public.site_pages to anon, authenticated;

drop policy if exists site_pages_read_public on public.site_pages;
create policy site_pages_read_public
  on public.site_pages
  for select
  using (true);

create or replace function public.site_page_save(
  p_page     text,
  p_body     text,
  p_photos   jsonb,
  p_revision int
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor  uuid := auth.uid();
  v_rev    int;
  v_photos jsonb;
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;

  perform public.require_capability('site.content');

  if p_page not in ('about', 'privacy', 'terms', 'guidelines') then
    raise exception using errcode = '22023', message = 'unknown_page';
  end if;

  if p_body is null or char_length(p_body) > 50000 then
    raise exception using errcode = '22023', message = 'body_too_long';
  end if;

  if p_photos is null or jsonb_typeof(p_photos) <> 'array' or jsonb_array_length(p_photos) > 12 then
    raise exception using errcode = '22023', message = 'photos_invalid';
  end if;

  v_photos := p_photos;
  if jsonb_array_length(v_photos) > 0 then
    if exists (
      select 1
      from jsonb_array_elements(v_photos) entry
      where jsonb_typeof(entry) <> 'object'
         or not (entry->>'url') ~ '^https://'
         or char_length(coalesce(entry->>'url', '')) > 2048
         or char_length(btrim(coalesce(entry->>'alt', ''))) not between 3 and 500
         or char_length(coalesce(entry->>'credit', '')) > 300
    ) then
      raise exception using errcode = '22023', message = 'photos_invalid';
    end if;
  end if;

  select revision into v_rev from public.site_pages where page = p_page;

  if v_rev is null then
    insert into public.site_pages (page, body, photos, revision, updated_at, updated_by)
      values (p_page, btrim(p_body), v_photos, 1, now(), v_actor);
    v_rev := 1;
  else
    if p_revision is distinct from v_rev then
      raise exception using errcode = '40001', message = 'revision_conflict';
    end if;
    update public.site_pages
      set body = btrim(p_body),
          photos = v_photos,
          revision = v_rev + 1,
          updated_at = now(),
          updated_by = v_actor
      where page = p_page;
    v_rev := v_rev + 1;
  end if;

  perform public.audit_event('staff', 'site.page_save', 'site_page', v_actor, 'success',
    jsonb_build_object('page', p_page, 'revision', v_rev, 'photos', jsonb_array_length(v_photos)));

  return v_rev;
end;
$$;

revoke all on function public.site_page_save(text, text, jsonb, int) from public, anon;
grant execute on function public.site_page_save(text, text, jsonb, int) to authenticated;

commit;

drop trigger if exists site_pages_set_updated_at on public.site_pages;
create trigger site_pages_set_updated_at
  before update on public.site_pages
  for each row execute function public.set_updated_at();

-- Site content capability for the editable-pages workspace (catalogue entry only;
-- primary administrators hold it automatically, other roles can be granted it in the Roles UI).
insert into public.capabilities (key, description) values
  ('site.content', 'Edit the About page text/photos and public page notes from the staff workspace')
on conflict (key) do nothing;
