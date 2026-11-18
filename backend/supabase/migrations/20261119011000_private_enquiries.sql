-- Candidate private intake only; no public submission or staff access is
-- enabled. Requires a reviewed staff authorization/retention and abuse plan.
create table if not exists public.private_enquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('contact','advertising','correction')),
  sender_name text not null check (char_length(sender_name) between 2 and 100),
  sender_email text not null check (char_length(sender_email) <= 254 and sender_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  message text not null check (char_length(message) between 10 and 5000),
  created_at timestamptz not null default now()
);
alter table public.private_enquiries enable row level security;
revoke all on public.private_enquiries from public, anon, authenticated;

-- Only a trusted server may insert, after CSRF, validation and distributed
-- rate limits. No browser credential may be used to call this function.
create or replace function public.private_enquiry_submit(p_kind text, p_name text, p_email text, p_message text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid; name_value text := btrim(p_name); email_value text := lower(btrim(p_email)); message_value text := btrim(p_message);
begin
  if p_kind is null or p_kind not in ('contact','advertising','correction') or name_value is null or char_length(name_value) not between 2 and 100
    or email_value is null or char_length(email_value) > 254 or email_value !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    or message_value is null or char_length(message_value) not between 10 and 5000
    or name_value ~ '[[:cntrl:]]' then
    raise exception using errcode = '22023', message = 'invalid_enquiry';
  end if;
  insert into public.private_enquiries(kind,sender_name,sender_email,message) values(p_kind,name_value,email_value,message_value) returning id into result;
  return result;
end; $$;
revoke all on function public.private_enquiry_submit(text,text,text,text) from public, anon, authenticated;
grant execute on function public.private_enquiry_submit(text,text,text,text) to service_role;
