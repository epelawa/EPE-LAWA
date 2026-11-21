-- Repair the businesses check constraints.
-- Production drift: the email/phone/whatsapp pattern constraints were created with a doubly
-- escaped backslash (\\.) so any normal email address or phone number violated the rule and
-- every business insert through business_submit / business_staff_create failed with a 23514
-- error. This migration recreates the three constraints with the canonical definitions from
-- 20261102200011_business_directory.sql. Safe to replay: drops are conditional.

alter table public.businesses drop constraint if exists businesses_email_format;
alter table public.businesses add  constraint businesses_email_format check (
  email is null or email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
);

alter table public.businesses drop constraint if exists businesses_phone_format;
alter table public.businesses add  constraint businesses_phone_format check (
  phone is null or phone ~ '^\+?[0-9][0-9 ()-]{6,19}$'
);

alter table public.businesses drop constraint if exists businesses_whatsapp_format;
alter table public.businesses add  constraint businesses_whatsapp_format check (
  whatsapp is null or whatsapp ~ '^\+?[0-9][0-9 ()-]{6,19}$'
);
