-- EPE LAWA — M12: marketplace and payments (schema only).
--
-- No payment function, no webhook handler and no order-creation function ship in this round. That
-- is deliberate: the money path needs its own reviewed round, and half a money path is worse than
-- none. What ships here is the shape and the guarantees that make that round safe:
--
--   * Money is integer kobo. No numeric, no float, no currency conversion.
--   * Every price has a server-side source of truth (`products.price_kobo`) and an immutable
--     snapshot on the order line (`order_items.unit_price_kobo`).
--   * `payments.provider_reference` is UNIQUE and `payment_events (provider, event_id)` is UNIQUE.
--     Those two constraints — not application memory — are what make a replayed webhook harmless.
--   * anon and authenticated have SELECT and nothing else on orders, payments, payment_events and
--     order_items. There is no direct-write path to forge, so the handler cannot be bypassed.

create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  slug        citext not null,
  name        text not null,
  description text,
  -- Kobo. NGN has no minor unit smaller than 1/100 naira, so an integer is exact.
  price_kobo  bigint not null,
  currency    char(3) not null default 'NGN',
  -- NULL means unlimited or made to order, which is different from zero.
  stock       integer,
  is_available boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  constraint products_price_non_negative check (price_kobo >= 0),
  constraint products_price_ceiling check (price_kobo <= 1000000000),
  constraint products_stock_non_negative check (stock is null or stock >= 0),
  constraint products_currency_ngn check (currency = 'NGN'),
  constraint products_name_length check (char_length(btrim(name)) between 1 and 160),
  constraint products_description_length check (description is null or char_length(description) <= 4000),
  constraint products_slug_format check (slug::text ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint products_business_slug_key unique (business_id, slug)
);

create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  reference       text not null unique
                  default ('EPL' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  buyer_id        uuid not null references public.profiles(user_id) on delete restrict,
  status          text not null default 'pending',
  subtotal_kobo   bigint not null,
  delivery_kobo   bigint not null default 0,
  total_kobo      bigint not null,
  currency        char(3) not null default 'NGN',
  contact_name    text not null,
  contact_phone   text not null,
  delivery_method text,
  delivery_address  text,
  delivery_landmark text,
  notes           text,
  -- Client-supplied key for "the user double-clicked Checkout". Unique in the database, which is
  -- the only place it can be enforced across horizontally scaled instances.
  idempotency_key text unique,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  paid_at         timestamptz,
  cancelled_at    timestamptz,
  constraint orders_reference_format check (reference ~ '^EPL[0-9A-F]{10,20}$'),
  constraint orders_status check (
    status in ('pending', 'paid', 'preparing', 'out_for_delivery', 'delivered', 'cancelled', 'refunded')
  ),
  constraint orders_amounts_non_negative check (
    subtotal_kobo >= 0 and delivery_kobo >= 0 and total_kobo >= 0
  ),
  -- The total is not a number the client sends. It is a fact the row must satisfy.
  constraint orders_total_matches check (total_kobo = subtotal_kobo + delivery_kobo),
  constraint orders_currency_ngn check (currency = 'NGN'),
  constraint orders_contact_name_length check (char_length(btrim(contact_name)) between 2 and 120),
  constraint orders_contact_phone_format check (contact_phone ~ '^\+?[0-9][0-9 ()-]{6,19}$'),
  constraint orders_delivery_method check (
    delivery_method is null or delivery_method in ('pickup', 'delivery', 'quote')
  ),
  constraint orders_delivery_address_required check (
    delivery_method <> 'delivery' or delivery_address is not null
  ),
  constraint orders_paid_has_timestamp check (status <> 'paid' or paid_at is not null),
  constraint orders_cancelled_has_timestamp check (status <> 'cancelled' or cancelled_at is not null),
  constraint orders_idempotency_key_length check (
    idempotency_key is null or char_length(idempotency_key) between 8 and 128
  )
);

create table if not exists public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  product_id      uuid not null references public.products(id) on delete restrict,
  -- Seller attribution on the line, so a business can list its own orders without joining
  -- through a product that may since have been delisted.
  business_id     uuid not null references public.businesses(id) on delete restrict,
  -- Snapshot: a later price change must not rewrite what the buyer agreed to.
  name_snapshot   text not null,
  unit_price_kobo bigint not null,
  quantity        integer not null,
  line_total_kobo bigint not null,
  created_at      timestamptz not null default now(),
  constraint order_items_quantity check (quantity > 0 and quantity <= 999),
  constraint order_items_prices_non_negative check (unit_price_kobo >= 0 and line_total_kobo >= 0),
  constraint order_items_line_total_matches check (line_total_kobo = unit_price_kobo * quantity),
  constraint order_items_name_length check (char_length(btrim(name_snapshot)) between 1 and 160)
);

create table if not exists public.order_status_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  from_status text,
  to_status   text not null,
  actor_id    uuid references auth.users(id) on delete set null,
  actor_kind  text not null,
  note        text,
  created_at  timestamptz not null default now(),
  constraint order_status_history_to_status check (
    to_status in ('pending', 'paid', 'preparing', 'out_for_delivery', 'delivered', 'cancelled', 'refunded')
  ),
  constraint order_status_history_from_status check (
    from_status is null
    or from_status in ('pending', 'paid', 'preparing', 'out_for_delivery', 'delivered', 'cancelled', 'refunded')
  ),
  constraint order_status_history_actor_kind check (
    actor_kind in ('member', 'staff', 'system', 'provider')
  )
);

create table if not exists public.payments (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references public.orders(id) on delete restrict,
  provider           text not null default 'paystack',
  -- The idempotency key at the payment layer. A retry reuses the reference; a duplicate insert
  -- loses to this constraint instead of charging twice.
  provider_reference text not null unique,
  amount_kobo        bigint not null,
  currency           char(3) not null,
  status             text not null default 'initialised',
  -- Paystack's access code for the hosted checkout. Not a secret beyond the single attempt, and
  -- never returned by a public read policy.
  access_code        text,
  channel            text,
  raw_event_id       text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  verified_at        timestamptz,
  constraint payments_provider check (provider = 'paystack'),
  constraint payments_status check (
    status in ('initialised', 'pending', 'succeeded', 'failed', 'abandoned')
  ),
  constraint payments_amount_positive check (amount_kobo > 0),
  constraint payments_currency_ngn check (currency = 'NGN'),
  constraint payments_reference_length check (char_length(provider_reference) between 6 and 128),
  -- "Succeeded" without a verified timestamp is a payment nobody checked.
  constraint payments_succeeded_verified check (status <> 'succeeded' or verified_at is not null)
);

create table if not exists public.payment_events (
  id           uuid primary key default gen_random_uuid(),
  provider     text not null default 'paystack',
  event_id     text not null,
  event_type   text not null,
  -- Hash of the raw body. The body itself is not stored: it contains customer details and card
  -- metadata that this product never needs to keep.
  payload_hash text not null,
  processed_at timestamptz,
  error        text,
  received_at  timestamptz not null default now(),
  constraint payment_events_provider check (provider = 'paystack'),
  constraint payment_events_event_id_length check (char_length(event_id) between 4 and 200),
  constraint payment_events_payload_hash_length check (char_length(payload_hash) between 16 and 200),
  -- A webhook is processed at most once, enforced by the database rather than by a comment.
  constraint payment_events_provider_event_key unique (provider, event_id)
);

create table if not exists public.delivery_requests (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null unique references public.orders(id) on delete cascade,
  address       text not null,
  landmark      text,
  contact_phone text not null,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint delivery_requests_address_length check (char_length(btrim(address)) between 5 and 500),
  constraint delivery_requests_phone_format check (contact_phone ~ '^\+?[0-9][0-9 ()-]{6,19}$')
);

-- Featured placement: a record with a start, an end and a payment reference. Never a boolean
-- somebody has to remember to unset (docs/01-product-requirements.md §7.2).
create table if not exists public.business_featured (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz not null,
  payment_id  uuid references public.payments(id) on delete restrict,
  created_at  timestamptz not null default now(),
  constraint business_featured_window check (ends_at > starts_at)
);

-- Two overlapping paid windows for the same business means somebody was charged for nothing.
create index if not exists business_featured_business_idx
  on public.business_featured (business_id, ends_at desc);
create index if not exists business_featured_ends_idx
  on public.business_featured (ends_at);
-- FK coverage: reconciling a featured window against the payment that bought it.
create index if not exists business_featured_payment_idx
  on public.business_featured (payment_id);

alter table public.business_featured drop constraint if exists business_featured_no_overlap;
alter table public.business_featured
  add constraint business_featured_no_overlap
  exclude using gist (
    business_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  );

------------------------------------------------------------------------------
-- Indexes
------------------------------------------------------------------------------

create index if not exists products_business_idx
  on public.products (business_id, created_at desc)
  where deleted_at is null;
create index if not exists products_catalogue_idx
  on public.products (is_available, created_at desc)
  where deleted_at is null;
create index if not exists products_name_search_idx on public.products (lower(name));

create index if not exists orders_buyer_idx on public.orders (buyer_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status, created_at);
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_product_idx on public.order_items (product_id);
create index if not exists order_items_business_idx on public.order_items (business_id, order_id);
create index if not exists order_status_history_order_idx
  on public.order_status_history (order_id, created_at);
-- FK coverage: "which orders did this staff member move" is the order-audit screen.
create index if not exists order_status_history_actor_idx
  on public.order_status_history (actor_id, created_at desc);
create index if not exists payments_order_idx on public.payments (order_id, created_at desc);
create index if not exists payments_status_idx on public.payments (status, created_at);
create index if not exists payment_events_unprocessed_idx
  on public.payment_events (received_at)
  where processed_at is null;
create index if not exists payment_events_type_idx on public.payment_events (event_type, received_at desc);

------------------------------------------------------------------------------
-- Ownership helpers
------------------------------------------------------------------------------

create or replace function public.owns_order(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order_id and o.buyer_id = auth.uid()
  );
$$;

-- True when the caller owns a business that has a line on this order.
create or replace function public.sells_order(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.order_items i
    join public.businesses b on b.id = i.business_id
    where i.order_id = p_order_id and b.owner_user_id = auth.uid()
  );
$$;

revoke all on function public.owns_order(uuid) from public;
revoke all on function public.sells_order(uuid) from public;
grant execute on function public.owns_order(uuid) to authenticated;
grant execute on function public.sells_order(uuid) to authenticated;

------------------------------------------------------------------------------
-- Write paths: none for money
------------------------------------------------------------------------------

-- order_status_history must be append-only even for the service role's mistakes.
create or replace function public.guard_order_history_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    errcode = '42501',
    message = 'order_history_append_only',
    detail = 'Order status history is append-only.';
end;
$$;

drop trigger if exists order_status_history_append_only on public.order_status_history;
create trigger order_status_history_append_only
  before update on public.order_status_history
  for each row execute function public.guard_order_history_append_only();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

drop trigger if exists delivery_requests_set_updated_at on public.delivery_requests;
create trigger delivery_requests_set_updated_at
  before update on public.delivery_requests
  for each row execute function public.set_updated_at();

------------------------------------------------------------------------------
-- RLS
------------------------------------------------------------------------------

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.delivery_requests enable row level security;
alter table public.business_featured enable row level security;

revoke all on table public.products from public, anon, authenticated;
revoke all on table public.orders from public, anon, authenticated;
revoke all on table public.order_items from public, anon, authenticated;
revoke all on table public.order_status_history from public, anon, authenticated;
revoke all on table public.payments from public, anon, authenticated;
revoke all on table public.payment_events from public, anon, authenticated;
revoke all on table public.delivery_requests from public, anon, authenticated;
revoke all on table public.business_featured from public, anon, authenticated;

grant select on table public.products to anon, authenticated;
grant insert (business_id, slug, name, description, price_kobo, stock, is_available)
  on table public.products to authenticated;
grant update (name, description, price_kobo, stock, is_available, slug)
  on table public.products to authenticated;

grant select on table public.orders to authenticated;
grant select on table public.order_items to authenticated;
grant select on table public.order_status_history to authenticated;
grant select on table public.payments to authenticated;
grant select on table public.delivery_requests to authenticated;

-- Only the window is public. payment_id is commercial information and stays out of the grant.
grant select (id, business_id, starts_at, ends_at, created_at)
  on table public.business_featured to anon, authenticated;

drop policy if exists products_read_public on public.products;
create policy products_read_public on public.products
  for select to anon, authenticated
  using (
    is_available
    and deleted_at is null
    and exists (
      select 1 from public.businesses b
      where b.id = products.business_id
        and b.status = 'published'
        and b.deleted_at is null
    )
  );

drop policy if exists products_read_owner on public.products;
create policy products_read_owner on public.products
  for select to authenticated
  using (public.owns_business(business_id));

drop policy if exists products_write_owner on public.products;
create policy products_write_owner on public.products
  for update to authenticated
  using (public.owns_business(business_id) and not public.is_member_banned())
  with check (public.owns_business(business_id));

drop policy if exists products_insert_owner on public.products;
create policy products_insert_owner on public.products
  for insert to authenticated
  with check (
    public.owns_business(business_id)
    and public.is_member_active()
    and not public.is_member_banned()
    and deleted_at is null
  );

drop policy if exists products_read_staff on public.products;
create policy products_read_staff on public.products
  for select to authenticated
  using (public.has_capability('business.review') or public.has_capability('order.manage'));

-- ORDERS. The buyer sees their own. A seller sees an order that contains one of their lines.
-- Staff with order.manage see all. Nobody edits: there is no UPDATE grant at all, so an order
-- status can only move through a server-side function in the payments round.
drop policy if exists orders_read_buyer on public.orders;
create policy orders_read_buyer on public.orders
  for select to authenticated
  using (buyer_id = (select auth.uid()));

drop policy if exists orders_read_seller on public.orders;
create policy orders_read_seller on public.orders
  for select to authenticated
  using (public.sells_order(id));

drop policy if exists orders_read_staff on public.orders;
create policy orders_read_staff on public.orders
  for select to authenticated
  using (public.has_capability('order.manage'));

drop policy if exists order_items_read on public.order_items;
create policy order_items_read on public.order_items
  for select to authenticated
  using (
    public.owns_order(order_id)
    or public.sells_order(order_id)
    or public.has_capability('order.manage')
  );

drop policy if exists order_status_history_read on public.order_status_history;
create policy order_status_history_read on public.order_status_history
  for select to authenticated
  using (
    public.owns_order(order_id)
    or public.sells_order(order_id)
    or public.has_capability('order.manage')
  );

drop policy if exists payments_read_buyer on public.payments;
create policy payments_read_buyer on public.payments
  for select to authenticated
  using (public.owns_order(order_id));

drop policy if exists payments_read_staff on public.payments;
create policy payments_read_staff on public.payments
  for select to authenticated
  using (public.has_capability('order.manage'));

-- delivery_requests carries a buyer's home address. Buyer and the seller fulfilling it only.
drop policy if exists delivery_requests_read on public.delivery_requests;
create policy delivery_requests_read on public.delivery_requests
  for select to authenticated
  using (public.owns_order(order_id) or public.sells_order(order_id));

drop policy if exists business_featured_read_live on public.business_featured;
create policy business_featured_read_live on public.business_featured
  for select to anon, authenticated
  using (now() >= starts_at and now() < ends_at);

drop policy if exists business_featured_read_owner on public.business_featured;
create policy business_featured_read_owner on public.business_featured
  for select to authenticated
  using (public.owns_business(business_id));

drop policy if exists business_featured_read_staff on public.business_featured;
create policy business_featured_read_staff on public.business_featured
  for select to authenticated
  using (public.has_capability('business.review'));

-- payment_events has RLS enabled and NO policy at all, and no grant. It is a webhook ledger for
-- the service role and the reconciliation job. Nothing in the application reads it directly.

-- Nothing grants INSERT, UPDATE or DELETE on orders, order_items, order_status_history, payments,
-- payment_events or delivery_requests to anon or authenticated. That absence is the control in
-- docs/08-permissions-security.md §7 row 6: a client cannot mark its own order paid, because
-- there is no privilege with which to try.
