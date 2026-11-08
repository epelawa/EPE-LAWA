-- Who is Who: recorded achievements/contributions, subject to the same source gate as biographies.
alter table public.people add column if not exists achievements text;
alter table public.people drop constraint if exists people_achievements_length;
alter table public.people add constraint people_achievements_length
  check (achievements is null or char_length(achievements) <= 12000);
grant select (achievements) on table public.people to anon, authenticated;
create or replace view public.published_people
  with (security_invoker = true)
as
select
  p.id,
  p.slug::text as slug,
  p.full_name,
  p.preferred_name,
  p.portrait_key,
  p.portrait_alt,
  p.portrait_credit,
  p.community,
  p.community_note,
  p.biography,
  p.is_deceased,
  p.published_at,
  (v.verified_at is not null) as is_verified,
  v.verified_at,
  p.achievements
from public.people p
left join public.people_verifications v
  on v.person_id = p.id and v.superseded_at is null
where p.status = 'published'
  and p.deleted_at is null;
