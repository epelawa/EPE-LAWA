-- Marketplace requests remain unpaid until a separately reviewed provider integration exists.
alter table public.business_reviews drop constraint business_reviews_state;
alter table public.business_reviews add constraint business_reviews_state check (state in ('pending','visible','hidden'));
alter table public.business_reviews alter column state set default 'pending';
alter table public.business_reviews drop constraint business_reviews_hidden_requires_reason;
alter table public.business_reviews add constraint business_reviews_hidden_requires_reason check (state <> 'hidden' or (hidden_reason is not null and hidden_by is not null and hidden_at is not null));

create table if not exists public.business_review_moderation_history (
 id uuid primary key default gen_random_uuid(), review_id uuid not null references public.business_reviews(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null, decision text not null check (decision in ('approve','hide')),
 reason text not null check (char_length(btrim(reason)) between 5 and 1000), created_at timestamptz not null default now()
);
create index if not exists business_review_moderation_history_review_idx on public.business_review_moderation_history (review_id);
create index if not exists business_review_moderation_history_actor_idx on public.business_review_moderation_history (actor_id);
alter table public.business_review_moderation_history enable row level security;
revoke all on public.business_review_moderation_history from public, anon, authenticated;
grant select on public.business_review_moderation_history to authenticated;
create policy business_review_moderation_staff_read on public.business_review_moderation_history for select to authenticated using (public.has_capability('business.review'));

create or replace function public.business_review_moderate(p_review_id uuid, p_decision text, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.business_reviews%rowtype;
begin
 perform public.require_capability('business.review');
 if p_decision not in ('approve','hide') or char_length(btrim(coalesce(p_reason,''))) not between 5 and 1000 then raise exception using errcode='22023', message='invalid_moderation_decision'; end if;
 select * into r from public.business_reviews where id=p_review_id and deleted_at is null for update;
 if not found then raise exception using errcode='P0002', message='review_not_found'; end if;
 if r.author_id=auth.uid() then raise exception using errcode='42501', message='self_review_not_allowed'; end if;
 update public.business_reviews set state=case when p_decision='approve' then 'visible' else 'hidden' end,
 hidden_reason=case when p_decision='hide' then btrim(p_reason) else null end,
 hidden_by=case when p_decision='hide' then auth.uid() else null end,
 hidden_at=case when p_decision='hide' then now() else null end where id=p_review_id;
 insert into public.business_review_moderation_history(review_id,actor_id,decision,reason) values(p_review_id,auth.uid(),p_decision,btrim(p_reason));
end; $$;
revoke all on function public.business_review_moderate(uuid,text,text) from public;
grant execute on function public.business_review_moderate(uuid,text,text) to authenticated;

create or replace function public.marketplace_order_request(p_product_id uuid,p_quantity integer,p_contact_name text,p_contact_phone text,p_method text,p_address text default null,p_landmark text default null,p_notes text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare p public.products%rowtype; bid uuid; oid uuid; line_total bigint; nm text;
begin
 if auth.uid() is null or not public.is_member_active() or public.is_member_banned() then raise exception using errcode='42501', message='active_member_required'; end if;
 if p_quantity not between 1 and 999 or p_method not in ('pickup','delivery') then raise exception using errcode='22023', message='invalid_order_request'; end if;
 if char_length(btrim(coalesce(p_contact_name,''))) not between 2 and 120 or char_length(btrim(coalesce(p_contact_phone,''))) not between 7 and 20 then raise exception using errcode='22023', message='invalid_contact_details'; end if;
 if p_method='delivery' and char_length(btrim(coalesce(p_address,''))) not between 5 and 500 then raise exception using errcode='22023', message='delivery_address_required'; end if;
 select pr into p from public.products pr join public.businesses b on b.id=pr.business_id where pr.id=p_product_id and pr.deleted_at is null and pr.is_available and b.status='published' and b.deleted_at is null for update of pr;
 if not found then raise exception using errcode='P0002', message='product_unavailable'; end if;
 select pr.business_id into bid from public.products pr where pr.id=p_product_id;
 if not found then raise exception using errcode='P0002', message='product_unavailable'; end if;
 if p.stock is not null and p.stock<p_quantity then raise exception using errcode='22023', message='insufficient_stock'; end if;
 line_total:=p.price_kobo*p_quantity; nm:=p.name;
 insert into public.orders(buyer_id,status,subtotal_kobo,delivery_kobo,total_kobo,currency,contact_name,contact_phone,delivery_method,delivery_address,delivery_landmark,notes)
 values(auth.uid(),'pending',line_total,0,line_total,'NGN',btrim(p_contact_name),btrim(p_contact_phone),p_method,case when p_method='delivery' then btrim(p_address) else null end,case when p_method='delivery' then nullif(btrim(coalesce(p_landmark,'')),'') else null end,nullif(btrim(coalesce(p_notes,'')),'')) returning id into oid;
 insert into public.order_items(order_id,product_id,business_id,name_snapshot,unit_price_kobo,quantity,line_total_kobo) values(oid,p.id,bid,nm,p.price_kobo,p_quantity,line_total);
 insert into public.order_status_history(order_id,from_status,to_status,actor_id,actor_kind,note) values(oid,null,'pending',auth.uid(),'member','Order request created; payment unavailable.');
 return oid;
end; $$;
revoke all on function public.marketplace_order_request(uuid,integer,text,text,text,text,text,text) from public;
grant execute on function public.marketplace_order_request(uuid,integer,text,text,text,text,text,text) to authenticated;

create or replace function public.order_advance(p_order_id uuid,p_status text,p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare o public.orders%rowtype; actor text; seller boolean;
begin
 select * into o from public.orders where id=p_order_id for update;
 if not found then raise exception using errcode='P0002',message='order_not_found'; end if;
 seller:=public.sells_order(p_order_id);
 if public.has_capability('order.manage') then actor:='staff'; elsif seller then actor:='staff'; else raise exception using errcode='42501',message='order_manage_required'; end if;
 if p_status not in ('preparing','out_for_delivery','delivered','cancelled') then raise exception using errcode='22023',message='invalid_order_status'; end if;
 if not ((o.status='pending' and p_status in ('preparing','cancelled')) or (o.status='preparing' and p_status in ('out_for_delivery','delivered','cancelled')) or (o.status='out_for_delivery' and p_status in ('delivered','cancelled'))) then raise exception using errcode='22023',message='invalid_order_transition'; end if;
 update public.orders set status=p_status,cancelled_at=case when p_status='cancelled' then now() else cancelled_at end where id=p_order_id;
 insert into public.order_status_history(order_id,from_status,to_status,actor_id,actor_kind,note) values(p_order_id,o.status,p_status,auth.uid(),case when public.has_capability('order.manage') then 'staff' else 'member' end,nullif(btrim(coalesce(p_note,'')),''));
end; $$;
revoke all on function public.order_advance(uuid,text,text) from public;
grant execute on function public.order_advance(uuid,text,text) to authenticated;

-- Sponsored placement is displayable only when explicitly backed by a successful payment and live window.
create or replace view public.active_business_sponsorships as
 select f.business_id, f.starts_at, f.ends_at from public.business_featured f join public.payments p on p.id=f.payment_id and p.status='succeeded' and p.verified_at is not null where now()>=f.starts_at and now()<f.ends_at;
grant select on public.active_business_sponsorships to anon,authenticated;
-- New member reviews enter the moderation queue, never public visibility directly.
drop policy if exists business_reviews_insert_own on public.business_reviews;
create policy business_reviews_insert_own on public.business_reviews for insert to authenticated with check (
 author_id=(select auth.uid()) and public.is_member_active() and not public.is_member_banned() and state='pending' and deleted_at is null
 and exists(select 1 from public.businesses b where b.id=business_reviews.business_id and b.status='published' and b.deleted_at is null)
);
