-- EPE LAWA — feature program tables (forward-only).
--
-- Adds the persistence for the selected feature program: comment votes,
-- topic follows, business claims, contact-click counters, community events,
-- radio song requests, site polls and moderation appeals. Existing feature
-- tables (saved_articles, business_reviews, business_featured, business_photos,
-- breaking flags, notifications) are reused, not duplicated.
-- Every write path is a security-definer RPC with member/capability gating and
-- audit; direct table access is revoked.

-- ---------------------------------------------------------------- comment votes
create table if not exists public.comment_votes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint comment_votes_unique unique (comment_id, user_id)
);

create index if not exists comment_votes_comment_idx on public.comment_votes (comment_id);
create index if not exists comment_votes_user_idx on public.comment_votes (user_id);

alter table public.comment_votes enable row level security;

revoke all on public.comment_votes from anon, authenticated;

create policy comment_votes_public_read
  on public.comment_votes for select to authenticated, anon
  using (
    exists (
      select 1 from public.comments c
      join public.articles a on a.id = c.article_id
      where c.id = comment_votes.comment_id
        and c.state = 'visible'
        and a.published_version_id is not null
    )
  );

-- ---------------------------------------------------------------- topic follows
create table if not exists public.topic_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  topic_type text not null check (topic_type in ('news_category', 'forum_category')),
  topic_id uuid not null,
  created_at timestamptz not null default now(),
  constraint topic_follows_unique unique (user_id, topic_type, topic_id)
);

create index if not exists topic_follows_topic_idx on public.topic_follows (topic_type, topic_id);

alter table public.topic_follows enable row level security;

revoke all on public.topic_follows from anon, authenticated;

create policy topic_follows_own_select
  on public.topic_follows for select to authenticated
  using (user_id = auth.uid());

-- -------------------------------------------------------------- business claims
create table if not exists public.business_claims (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  message text not null check (char_length(btrim(message)) between 10 and 1000),
  status text not null default 'open' check (status in ('open', 'approved', 'rejected')),
  decision_note text check (decision_note is null or char_length(btrim(decision_note)) between 2 and 1000),
  decided_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_claims_unique_open unique (business_id, user_id, status)
);

create index if not exists business_claims_status_idx on public.business_claims (status, created_at);
create index if not exists business_claims_business_idx on public.business_claims (business_id);
create index if not exists business_claims_user_idx on public.business_claims (user_id);
drop trigger if exists business_claims_set_updated_at on public.business_claims;
create trigger business_claims_set_updated_at before update on public.business_claims
  for each row execute function public.set_updated_at();

alter table public.business_claims enable row level security;

revoke all on public.business_claims from anon, authenticated;

create policy business_claims_own_select
  on public.business_claims for select to authenticated
  using (user_id = auth.uid());

-- ------------------------------------------------------- business contact clicks
create table if not exists public.business_contact_clicks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  kind text not null check (kind in ('call', 'whatsapp', 'website', 'directions')),
  day date not null default current_date,
  clicks integer not null default 1,
  constraint business_contact_clicks_unique unique (business_id, kind, day)
);

create index if not exists business_contact_clicks_business_idx on public.business_contact_clicks (business_id, day);

alter table public.business_contact_clicks enable row level security;

revoke all on public.business_contact_clicks from anon, authenticated;

create policy business_contact_clicks_staff_read
  on public.business_contact_clicks for select to authenticated
  using (public.has_capability('business.review'));

-- ---------------------------------------------------------------------- events
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  venue text,
  category text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'submitted' check (status in ('submitted', 'published', 'rejected')),
  submitter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_title_length check (char_length(btrim(title)) between 3 and 200),
  constraint events_window check (ends_at is null or ends_at > starts_at)
);

create index if not exists events_status_starts_idx on public.events (status, starts_at);
create index if not exists events_submitter_idx on public.events (submitter_id);
drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at before update on public.events
  for each row execute function public.set_updated_at();

alter table public.events enable row level security;

revoke all on public.events from anon, authenticated;

create policy events_public_read
  on public.events for select to anon, authenticated
  using (
    (status = 'published' and published_at is not null)
    or (submitter_id = auth.uid() and auth.uid() is not null)
    or public.has_capability('article.publish')
  );

-- ------------------------------------------------------- radio song requests
create table if not exists public.radio_song_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  programme_id uuid references public.programmes(id) on delete set null,
  song text not null check (char_length(btrim(song)) between 2 and 200),
  note text check (note is null or char_length(btrim(note)) between 2 and 500),
  status text not null default 'new' check (status in ('new', 'played', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists radio_song_requests_status_idx on public.radio_song_requests (status, created_at);
create index if not exists radio_song_requests_user_idx on public.radio_song_requests (user_id);
create index if not exists radio_song_requests_programme_idx on public.radio_song_requests (programme_id);
drop trigger if exists radio_song_requests_set_updated_at on public.radio_song_requests;
create trigger radio_song_requests_set_updated_at before update on public.radio_song_requests
  for each row execute function public.set_updated_at();

alter table public.radio_song_requests enable row level security;

revoke all on public.radio_song_requests from anon, authenticated;

create policy radio_song_requests_own_select
  on public.radio_song_requests for select to authenticated
  using (user_id = auth.uid() or public.has_capability('radio.manage'));

-- ------------------------------------------------------------------ site polls
create table if not exists public.site_polls (
  id uuid primary key default gen_random_uuid(),
  question text not null check (char_length(btrim(question)) between 6 and 200),
  status text not null default 'active' check (status in ('active', 'closed')),
  ends_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.site_polls(id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 120),
  sort_order integer not null default 0
);

create table if not exists public.site_poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.site_polls(id) on delete cascade,
  option_id uuid not null references public.site_poll_options(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint site_poll_votes_unique unique (poll_id, user_id)
);

create index if not exists site_poll_votes_option_idx on public.site_poll_votes (option_id);
create index if not exists site_poll_options_poll_idx on public.site_poll_options (poll_id, sort_order);
drop trigger if exists site_polls_set_updated_at on public.site_polls;
create trigger site_polls_set_updated_at before update on public.site_polls
  for each row execute function public.set_updated_at();

alter table public.site_polls enable row level security;
alter table public.site_poll_options enable row level security;
alter table public.site_poll_votes enable row level security;

revoke all on public.site_polls from anon, authenticated;
revoke all on public.site_poll_options from anon, authenticated;
revoke all on public.site_poll_votes from anon, authenticated;

create policy site_polls_public_read on public.site_polls for select to anon, authenticated using (status = 'active' or public.has_capability('article.publish'));
create policy site_poll_options_public_read on public.site_poll_options for select to anon, authenticated using (true);
create policy site_poll_votes_own_select on public.site_poll_votes for select to authenticated using (user_id = auth.uid() or public.has_capability('article.publish'));

-- ----------------------------------------------------------- moderation appeals
create table if not exists public.moderation_appeals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  resource_type text not null check (resource_type in ('member_ban', 'moderation_action')),
  action_id uuid not null,
  statement text not null check (char_length(btrim(statement)) between 10 and 2000),
  status text not null default 'open' check (status in ('open', 'granted', 'denied')),
  decision_note text check (decision_note is null or char_length(btrim(decision_note)) between 2 and 1000),
  decided_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint moderation_appeals_unique_action unique (resource_type, action_id)
);

create index if not exists moderation_appeals_status_idx on public.moderation_appeals (status, created_at);
create index if not exists moderation_appeals_user_idx on public.moderation_appeals (user_id);
drop trigger if exists moderation_appeals_set_updated_at on public.moderation_appeals;
create trigger moderation_appeals_set_updated_at before update on public.moderation_appeals
  for each row execute function public.set_updated_at();

alter table public.moderation_appeals enable row level security;

revoke all on public.moderation_appeals from anon, authenticated;

create policy moderation_appeals_own_select
  on public.moderation_appeals for select to authenticated
  using (user_id = auth.uid() or public.has_capability('moderation.review'));

-- --------------------------------------------------------------- member RPCs
create or replace function public.comment_vote_toggle(p_comment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exists boolean;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'vote_forbidden';
  end if;
  if not exists (
    select 1 from public.comments c
    join public.articles a on a.id = c.article_id
    where c.id = p_comment_id and c.state = 'visible' and a.published_version_id is not null
  ) then
    raise exception using errcode = '22023', message = 'vote_comment_unknown';
  end if;
  select exists (select 1 from public.comment_votes where comment_id = p_comment_id and user_id = auth.uid())
    into v_exists;
  if v_exists then
    delete from public.comment_votes where comment_id = p_comment_id and user_id = auth.uid();
    return false;
  end if;
  insert into public.comment_votes (comment_id, user_id) values (p_comment_id, auth.uid());
  perform public.audit_event('member', 'comment.vote', 'comment', p_comment_id, 'success', null);
  return true;
end;
$$;

create or replace function public.topic_follow_toggle(p_topic_type text, p_topic_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exists boolean;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'follow_forbidden';
  end if;
  if p_topic_type not in ('news_category', 'forum_category') then
    raise exception using errcode = '22023', message = 'follow_type_invalid';
  end if;
  if p_topic_id is null or not exists (
    select 1 from (
      select id from public.categories where p_topic_type = 'news_category'
      union all
      select id from public.forum_categories where p_topic_type = 'forum_category'
    ) t where t.id = p_topic_id
  ) then
    raise exception using errcode = '22023', message = 'follow_topic_unknown';
  end if;
  select exists (
    select 1 from public.topic_follows
    where user_id = auth.uid() and topic_type = p_topic_type and topic_id = p_topic_id
  ) into v_exists;
  if v_exists then
    delete from public.topic_follows
    where user_id = auth.uid() and topic_type = p_topic_type and topic_id = p_topic_id;
    return false;
  end if;
  insert into public.topic_follows (user_id, topic_type, topic_id)
  values (auth.uid(), p_topic_type, p_topic_id);
  perform public.audit_event('member', 'follow.toggle', p_topic_type, p_topic_id, 'success',
    jsonb_build_object('following', true));
  return true;
end;
$$;

create or replace function public.member_business_claim(p_business_id uuid, p_message text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'claim_forbidden';
  end if;
  if p_message is null or char_length(btrim(p_message)) not between 10 and 1000 then
    raise exception using errcode = '22023', message = 'claim_message_invalid';
  end if;
  if p_business_id is null or not exists (
    select 1 from public.businesses b where b.id = p_business_id and b.status = 'published' and b.deleted_at is null
  ) then
    raise exception using errcode = '22023', message = 'claim_business_unknown';
  end if;
  if exists (select 1 from public.businesses where id = p_business_id and owner_user_id = auth.uid()) then
    raise exception using errcode = '22023', message = 'claim_already_owner';
  end if;
  if exists (
    select 1 from public.business_claims
    where business_id = p_business_id and user_id = auth.uid() and status = 'open'
  ) then
    raise exception using errcode = '22023', message = 'claim_already_open';
  end if;
  insert into public.business_claims (business_id, user_id, message)
  values (p_business_id, auth.uid(), btrim(p_message))
  returning id into v_id;
  perform public.audit_event('member', 'business.claim', 'business', p_business_id, 'success',
    jsonb_build_object('claim_id', v_id));
  return v_id;
end;
$$;

create or replace function public.business_track_click(p_slug text, p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_kind not in ('call', 'whatsapp', 'website', 'directions') then
    raise exception using errcode = '22023', message = 'click_kind_invalid';
  end if;
  insert into public.business_contact_clicks (business_id, kind, day, clicks)
  select b.id, p_kind, current_date, 1
  from public.businesses b
  where b.slug = p_slug and b.status = 'published' and b.deleted_at is null
  on conflict (business_id, kind, day) do update set clicks = business_contact_clicks.clicks + 1;
end;
$$;

create or replace function public.member_event_submit(p_title text, p_description text, p_venue text, p_category text, p_starts_at timestamptz, p_ends_at timestamptz)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_slug text;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'event_forbidden';
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 3 and 200
    or p_description is null or char_length(btrim(p_description)) not between 10 and 4000
    or p_venue is null or char_length(btrim(p_venue)) not between 2 and 200 then
    raise exception using errcode = '22023', message = 'event_fields_invalid';
  end if;
  if p_starts_at is null or p_starts_at < now() - interval '1 day'
    or (p_ends_at is not null and p_ends_at <= p_starts_at)
    or (p_ends_at is not null and p_ends_at > p_starts_at + interval '30 days') then
    raise exception using errcode = '22023', message = 'event_window_invalid';
  end if;
  v_slug := coalesce(public.slugify(btrim(p_title)) || '-' || substr(md5(random()::text), 1, 6), 'event-' || substr(md5(random()::text), 1, 8));
  insert into public.events (slug, title, description, venue, category, starts_at, ends_at, submitter_id)
  values (v_slug, btrim(p_title), btrim(p_description), btrim(p_venue),
    nullif(btrim(coalesce(p_category, '')), ''), p_starts_at, p_ends_at, auth.uid())
  returning id into v_id;
  perform public.audit_event('member', 'event.submit', 'event', v_id, 'success', null);
  return v_id;
end;
$$;

create or replace function public.member_request_song(p_song text, p_note text, p_programme_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'request_forbidden';
  end if;
  if p_song is null or char_length(btrim(p_song)) not between 2 and 200
    or (p_note is not null and p_note <> '' and char_length(btrim(p_note)) not between 2 and 500) then
    raise exception using errcode = '22023', message = 'request_fields_invalid';
  end if;
  if p_programme_id is not null and not exists (select 1 from public.programmes where id = p_programme_id) then
    raise exception using errcode = '22023', message = 'request_programme_unknown';
  end if;
  insert into public.radio_song_requests (user_id, programme_id, song, note)
  values (auth.uid(), p_programme_id, btrim(p_song), nullif(btrim(coalesce(p_note, '')), ''))
  returning id into v_id;
  perform public.audit_event('member', 'radio.request', 'radio_song_request', v_id, 'success', null);
  return v_id;
end;
$$;

create or replace function public.site_poll_vote(p_option_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_poll_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'vote_forbidden';
  end if;
  select o.poll_id into v_poll_id from public.site_poll_options o where o.id = p_option_id;
  if v_poll_id is null or not exists (
    select 1 from public.site_polls p
    where p.id = v_poll_id and p.status = 'active' and (p.ends_at is null or p.ends_at > now())
  ) then
    raise exception using errcode = '22023', message = 'vote_poll_inactive';
  end if;
  insert into public.site_poll_votes (poll_id, option_id, user_id)
  values (v_poll_id, p_option_id, auth.uid())
  on conflict (poll_id, user_id) do update set option_id = excluded.option_id, created_at = now();
  perform public.audit_event('member', 'poll.vote', 'site_poll', v_poll_id, 'success', null);
end;
$$;

create or replace function public.member_appeal_moderation(p_resource_type text, p_action_id uuid, p_statement text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'appeal_forbidden';
  end if;
  if p_resource_type not in ('member_ban', 'moderation_action') or p_action_id is null
    or p_statement is null or char_length(btrim(p_statement)) not between 10 and 2000 then
    raise exception using errcode = '22023', message = 'appeal_fields_invalid';
  end if;
  insert into public.moderation_appeals (user_id, resource_type, action_id, statement)
  values (auth.uid(), p_resource_type, p_action_id, btrim(p_statement))
  returning id into v_id;
  perform public.audit_event('member', 'moderation.appeal', p_resource_type, p_action_id, 'success',
    jsonb_build_object('appeal_id', v_id));
  return v_id;
end;
$$;

-- ---------------------------------------------------------------- staff RPCs
create or replace function public.staff_decide_business_claim(p_claim_id uuid, p_status text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_capability('business.review') then
    raise exception using errcode = '42501', message = 'claim_forbidden';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception using errcode = '22023', message = 'claim_status_invalid';
  end if;
  if p_status = 'rejected' and (p_note is null or char_length(btrim(p_note)) < 2) then
    raise exception using errcode = '22023', message = 'claim_note_required';
  end if;
  if not exists (select 1 from public.business_claims where id = p_claim_id and status = 'open') then
    raise exception using errcode = '22023', message = 'claim_unknown';
  end if;
  update public.business_claims
    set status = p_status,
        decision_note = nullif(btrim(coalesce(p_note, '')), ''),
        decided_by = auth.uid(),
        updated_at = now()
    where id = p_claim_id and status = 'open';
  if p_status = 'approved' then
    update public.businesses b
      set owner_user_id = (select user_id from public.business_claims where id = p_claim_id)
      where b.id = (select business_id from public.business_claims where id = p_claim_id)
        and b.owner_user_id is null;
  end if;
  perform public.audit_event('staff', 'business.claim_decide', 'business_claim', p_claim_id, 'success',
    jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.staff_set_business_featured(p_business_id uuid, p_days integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_capability('business.review') then
    raise exception using errcode = '42501', message = 'featured_forbidden';
  end if;
  if p_business_id is null or not exists (
    select 1 from public.businesses where id = p_business_id and status = 'published' and deleted_at is null
  ) then
    raise exception using errcode = '22023', message = 'featured_business_unknown';
  end if;
  if p_days is null or p_days not between 1 and 90 then
    raise exception using errcode = '22023', message = 'featured_days_invalid';
  end if;
  delete from public.business_featured where ends_at > now();
  insert into public.business_featured (business_id, starts_at, ends_at)
  values (p_business_id, now(), now() + make_interval(days => p_days));
  perform public.audit_event('staff', 'business.featured', 'business', p_business_id, 'success',
    jsonb_build_object('days', p_days));
end;
$$;

create or replace function public.staff_event_decide(p_event_id uuid, p_status text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_capability('article.publish') then
    raise exception using errcode = '42501', message = 'event_forbidden';
  end if;
  if p_status not in ('published', 'rejected') then
    raise exception using errcode = '22023', message = 'event_status_invalid';
  end if;
  if p_status = 'rejected' and (p_note is null or char_length(btrim(p_note)) < 2) then
    raise exception using errcode = '22023', message = 'event_note_required';
  end if;
  if not exists (select 1 from public.events where id = p_event_id and status = 'submitted') then
    raise exception using errcode = '22023', message = 'event_unknown';
  end if;
  update public.events
    set status = p_status,
        published_at = case when p_status = 'published' then now() else null end,
        updated_at = now()
    where id = p_event_id and status = 'submitted';
  perform public.audit_event('staff', 'event.decide', 'event', p_event_id, 'success',
    jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.staff_song_request_update(p_request_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_capability('radio.manage') then
    raise exception using errcode = '42501', message = 'request_forbidden';
  end if;
  if p_status not in ('played', 'rejected') then
    raise exception using errcode = '22023', message = 'request_status_invalid';
  end if;
  if not exists (select 1 from public.radio_song_requests where id = p_request_id and status = 'new') then
    raise exception using errcode = '22023', message = 'request_unknown';
  end if;
  update public.radio_song_requests set status = p_status, updated_at = now()
    where id = p_request_id and status = 'new';
  perform public.audit_event('staff', 'radio.request_decide', 'radio_song_request', p_request_id, 'success',
    jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.site_poll_save(p_question text, p_options text[], p_days integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_row record;
  v_sort integer := 0;
begin
  if not public.has_capability('article.publish') then
    raise exception using errcode = '42501', message = 'poll_forbidden';
  end if;
  if p_question is null or char_length(btrim(p_question)) not between 6 and 200
    or p_options is null or array_length(p_options, 1) < 2 or array_length(p_options, 1) > 6
    or exists (select 1 from unnest(p_options) o where o is null or char_length(btrim(o)) not between 1 and 120)
    or p_days is null or p_days not between 1 and 90 then
    raise exception using errcode = '22023', message = 'poll_fields_invalid';
  end if;
  update public.site_polls set status = 'closed', updated_at = now() where status = 'active';
  insert into public.site_polls (question, ends_at, created_by)
  values (btrim(p_question), now() + make_interval(days => p_days), auth.uid())
  returning id into v_id;
  foreach v_row in array p_options loop
    v_sort := v_sort + 1;
    insert into public.site_poll_options (poll_id, label, sort_order) values (v_id, btrim(v_row), v_sort);
  end loop;
  perform public.audit_event('staff', 'poll.save', 'site_poll', v_id, 'success', null);
  return v_id;
end;
$$;

create or replace function public.staff_decide_appeal(p_appeal_id uuid, p_status text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_capability('moderation.review') then
    raise exception using errcode = '42501', message = 'appeal_forbidden';
  end if;
  if p_status not in ('granted', 'denied') then
    raise exception using errcode = '22023', message = 'appeal_status_invalid';
  end if;
  if (p_note is null or char_length(btrim(p_note)) < 2) then
    raise exception using errcode = '22023', message = 'appeal_note_required';
  end if;
  if not exists (select 1 from public.moderation_appeals where id = p_appeal_id and status = 'open') then
    raise exception using errcode = '22023', message = 'appeal_unknown';
  end if;
  update public.moderation_appeals
    set status = p_status, decision_note = btrim(p_note), decided_by = auth.uid(), updated_at = now()
    where id = p_appeal_id and status = 'open';
  perform public.audit_event('staff', 'moderation.appeal_decide', 'moderation_appeal', p_appeal_id, 'success',
    jsonb_build_object('status', p_status));
end;
$$;

-- ------------------------------------------------------- follow notifications
-- Publishing an article notifies members following its published category.
create or replace function public.notify_followers_article_published()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.published_at is null or old.published_at is not null then
    return new;
  end if;
  insert into public.notifications (user_id, kind, title, url, resource_type, resource_id)
  select f.user_id, 'follow_article', 'New story: ' || v.title, '/news/' || a.slug, 'article', a.id
  from public.articles a
  join public.article_versions v on v.id = a.published_version_id
  join public.topic_follows f on f.topic_type = 'news_category' and f.topic_id = v.category_id
  where a.id = new.id;
  return new;
end;
$$;

drop trigger if exists articles_notify_followers on public.articles;
create trigger articles_notify_followers
  after update of published_at on public.articles
  for each row execute function public.notify_followers_article_published();

-- ------------------------------------------------------------ grants
grant execute on function public.comment_vote_toggle(uuid) to authenticated;
grant execute on function public.topic_follow_toggle(text, uuid) to authenticated;
grant execute on function public.business_track_click(text, text) to anon, authenticated;
grant execute on function public.member_business_claim(uuid, text) to authenticated;
grant execute on function public.member_event_submit(text, text, text, text, timestamptz, timestamptz) to authenticated;
grant execute on function public.member_request_song(text, text, uuid) to authenticated;
grant execute on function public.site_poll_vote(uuid) to authenticated;
grant execute on function public.member_appeal_moderation(text, uuid, text) to authenticated;
grant execute on function public.staff_decide_business_claim(uuid, text, text) to authenticated;
grant execute on function public.staff_set_business_featured(uuid, integer) to authenticated;
grant execute on function public.staff_event_decide(uuid, text, text) to authenticated;
grant execute on function public.staff_song_request_update(uuid, text) to authenticated;
grant execute on function public.site_poll_save(text, text[], integer) to authenticated;
grant execute on function public.staff_decide_appeal(uuid, text, text) to authenticated;
