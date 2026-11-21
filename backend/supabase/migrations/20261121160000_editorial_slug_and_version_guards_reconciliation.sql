-- Reconciliation: editorial slug helpers and article_version immutability guard.
--
-- The live production schema was built from later reconciliation migrations that did not
-- carry slugify/article_slug or the guard_article_version trigger from
-- 20261102190002_editorial_core.sql / 20261107195000_direct_article_publish_verified_staff.sql.
-- Staff authoring RPCs (people_create, forum_create_thread) depend on slugify, so the helpers
-- are restored first. Additive only; the latest guard version (published-version aware) wins.
-- Function bodies below are copied verbatim from those files.

create or replace function public.slugify(p_input text)
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(
    trim(both '-' from
      regexp_replace(
        translate(
          lower(coalesce(p_input, '')),
          'àáâãäåāăąçćčèéêëēĕėęěìíîïĩīĭįñńņǹòóôõöøōŏőùúûüũūŭůűųšśşžźżẹọṣ',
          'aaaaaaaaaccc' || 'eeeeeeeee' || 'iiiiiiii' || 'nnnn' || 'ooooooooo'
            || 'uuuuuuuuuu' || 'sss' || 'zzz' || 'eos'
        ),
        '[^a-z0-9]+', '-', 'g'
      )
    ),
    ''
  );
$$;

-- The two translate() strings map one character to one character. They are written as
-- concatenated groups so each group can be counted against its source group during review:
-- 9+3+9+8+4+8+10+3+3+3 = 60 on both sides. A length mismatch silently deletes characters,
-- which is why the groups are explicit rather than one long literal.

create or replace function public.article_slug(p_title text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_base      text;
  v_candidate text;
  v_n         integer := 1;
begin
  v_base := coalesce(public.slugify(p_title), 'article');
  v_candidate := v_base;

  loop
    exit when not exists (
      select 1 from public.articles a where a.slug = v_candidate
    );
    v_n := v_n + 1;
    if v_n > 50 then
      -- Give up on the readable sequence and fall back to entropy. The unique constraint is
      -- still the final authority; a collision here raises rather than silently reusing a slug.
      v_candidate := v_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
      exit;
    end if;
    v_candidate := v_base || '-' || v_n::text;
  end loop;

  return v_candidate;
end;
$$;

create or replace function public.guard_article_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception using
      errcode = '42501',
      message = 'article_version_immutable',
      detail = 'Article versions are a permanent record. Unpublish the article instead of deleting history.';
  end if;

  if new.article_id <> old.article_id
     or new.version_number <> old.version_number
     or new.created_by <> old.created_by
     or new.created_at <> old.created_at then
    raise exception using
      errcode = '42501',
      message = 'article_version_immutable',
      detail = 'A version cannot be moved to another article, renumbered, or reattributed.';
  end if;

  if old.state in ('approved', 'published') and (
       new.title is distinct from old.title
    or new.summary is distinct from old.summary
    or new.body is distinct from old.body
    or new.author_id is distinct from old.author_id
    or new.category_id is distinct from old.category_id
    or new.seo_title is distinct from old.seo_title
    or new.seo_description is distinct from old.seo_description
    or new.og_image_key is distinct from old.og_image_key
  ) then
    raise exception using
      errcode = '42501',
      message = case when old.state = 'published'
        then 'published_version_immutable'
        else 'approved_version_immutable'
      end,
      detail = 'Create a new version for a correction. Published and approved snapshots cannot be edited in place.';
  end if;

  if old.state <> new.state and not (
       -- Production's terminal published state is 'approved' (the live article_publish moves a
       -- draft or review version straight to 'approved' in direct-publish mode), so 'approved'
       -- is an allowed target from 'draft' even though the source migration also listed
       -- 'published'. The 'published' targets are kept for the direct-publish migration's own
       -- workflow; review may still reach draft/approved/rejected/published.
       (old.state = 'draft' and new.state in ('review', 'approved', 'published'))
    or (old.state = 'review' and new.state in ('draft', 'approved', 'rejected', 'published'))
    or (old.state = 'approved' and new.state = 'published')
  ) then
    raise exception using
      errcode = '42501',
      message = 'invalid_version_transition',
      detail = format('Cannot move an article version from %s to %s.', old.state, new.state);
  end if;

  return new;
end;
$$;

drop trigger if exists article_versions_guard on public.article_versions;
create trigger article_versions_guard
  before update or delete on public.article_versions
  for each row execute function public.guard_article_version();
