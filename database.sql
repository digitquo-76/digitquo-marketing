-- DigitQuo production schema for Supabase.
-- Run this in the Supabase SQL editor after reviewing the policies for your business rules.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('seller', 'broker', 'admin')),
  email text not null,
  display_name text,
  business_name text,
  business_type text,
  market text,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.profiles add column if not exists business_name text;
alter table public.profiles add column if not exists business_type text;
alter table public.profiles add column if not exists market text;
alter table public.profiles add column if not exists onboarding_complete boolean not null default false;

create table if not exists public.products (
  id text primary key,
  name text not null check (char_length(name) between 1 and 120),
  category text not null check (char_length(category) between 1 and 80),
  mrp numeric(12, 2) not null check (mrp > 0),
  price numeric(12, 2) not null check (price > 0 and price <= mrp),
  stock integer not null default 0 check (stock >= 0),
  seller text not null,
  image text,
  description text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.sales (
  id text primary key,
  product_id text not null references public.products(id) on delete restrict,
  product_name text not null,
  seller text not null,
  customer text not null check (char_length(customer) between 1 and 120),
  customer_phone text not null default '',
  customer_address text not null default '',
  order_notes text not null default '',
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price > 0),
  total numeric(12, 2) not null check (total >= 0),
  points numeric(12, 2) not null check (points >= 0),
  broker text not null,
  razorpay_order_id text,
  razorpay_payment_id text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.sales add column if not exists customer_phone text not null default '';
alter table public.sales add column if not exists customer_address text not null default '';
alter table public.sales add column if not exists order_notes text not null default '';
alter table public.sales add column if not exists razorpay_order_id text;
alter table public.sales add column if not exists razorpay_payment_id text;

create table if not exists public.claims (
  id text primary key,
  broker text not null,
  points numeric(12, 2) not null check (points > 0),
  status text not null default 'pending' check (status in ('pending', 'paid')),
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.activity (
  id text primary key,
  type text not null check (type in ('sale', 'product')),
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists products_seller_idx on public.products (seller);
create index if not exists sales_broker_idx on public.sales (broker);
create index if not exists sales_seller_idx on public.sales (seller);
create unique index if not exists sales_razorpay_payment_id_key on public.sales (razorpay_payment_id) where razorpay_payment_id is not null;
create unique index if not exists sales_razorpay_order_id_key on public.sales (razorpay_order_id) where razorpay_order_id is not null;
create index if not exists claims_broker_idx on public.claims (broker);
create index if not exists activity_created_at_idx on public.activity (created_at desc);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.claims enable row level security;
alter table public.activity enable row level security;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_profile_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(display_name, email) from public.profiles where id = auth.uid()
$$;

create or replace function public.current_profile_onboarded()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(onboarding_complete, false) from public.profiles where id = auth.uid()
$$;

create or replace function public.place_order(
  p_order_id text,
  p_product_id text,
  p_customer text,
  p_customer_phone text,
  p_customer_address text,
  p_order_notes text,
  p_quantity integer
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_order public.sales%rowtype;
  v_broker text;
  v_total numeric(12, 2);
  v_points numeric(12, 2);
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to place an order.';
  end if;

  if coalesce(public.current_profile_role(), '') <> 'broker' or coalesce(public.current_profile_onboarded(), false) = false then
    raise exception 'Only onboarded brokers can place orders.';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'Enter a valid order quantity.';
  end if;

  if char_length(btrim(coalesce(p_customer, ''))) < 1 then
    raise exception 'Customer name is required.';
  end if;

  if char_length(btrim(coalesce(p_customer_phone, ''))) < 1 then
    raise exception 'Customer phone is required.';
  end if;

  if char_length(btrim(coalesce(p_customer_address, ''))) < 1 then
    raise exception 'Customer address is required.';
  end if;

  select *
    into v_product
    from public.products
    where id = p_product_id
    for update;

  if not found then
    raise exception 'Product not found.';
  end if;

  if v_product.stock < p_quantity then
    raise exception 'Only % units are available.', v_product.stock;
  end if;

  v_broker := public.current_profile_name();
  v_total := v_product.price * p_quantity;
  v_points := greatest(0, (v_product.mrp - v_product.price) * p_quantity);

  update public.products
    set stock = stock - p_quantity
    where id = v_product.id;

  insert into public.sales (
    id,
    product_id,
    product_name,
    seller,
    customer,
    customer_phone,
    customer_address,
    order_notes,
    quantity,
    unit_price,
    total,
    points,
    broker
  )
  values (
    p_order_id,
    v_product.id,
    v_product.name,
    v_product.seller,
    btrim(p_customer),
    btrim(p_customer_phone),
    btrim(p_customer_address),
    btrim(coalesce(p_order_notes, '')),
    p_quantity,
    v_product.price,
    v_total,
    v_points,
    v_broker
  )
  returning * into v_order;

  return v_order;
end;
$$;

revoke all on function public.place_order(text, text, text, text, text, text, integer) from public, anon, authenticated;

create or replace function public.place_paid_order(
  p_order_id text,
  p_product_id text,
  p_customer text,
  p_customer_phone text,
  p_customer_address text,
  p_order_notes text,
  p_quantity integer,
  p_broker text,
  p_razorpay_order_id text,
  p_razorpay_payment_id text
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_order public.sales%rowtype;
  v_existing public.sales%rowtype;
  v_broker text;
  v_total numeric(12, 2);
  v_points numeric(12, 2);
  v_razorpay_order_id text;
  v_razorpay_payment_id text;
begin
  v_broker := btrim(coalesce(p_broker, ''));
  v_razorpay_order_id := btrim(coalesce(p_razorpay_order_id, ''));
  v_razorpay_payment_id := btrim(coalesce(p_razorpay_payment_id, ''));

  if char_length(v_broker) < 1 then
    raise exception 'Broker identity is required.';
  end if;

  if char_length(v_razorpay_order_id) < 1 or char_length(v_razorpay_payment_id) < 1 then
    raise exception 'Razorpay payment identifiers are required.';
  end if;

  select *
    into v_existing
    from public.sales
    where razorpay_payment_id = v_razorpay_payment_id
    limit 1;

  if found then
    return v_existing;
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'Enter a valid order quantity.';
  end if;

  if char_length(btrim(coalesce(p_customer, ''))) < 1 then
    raise exception 'Customer name is required.';
  end if;

  if char_length(btrim(coalesce(p_customer_phone, ''))) < 1 then
    raise exception 'Customer phone is required.';
  end if;

  if char_length(btrim(coalesce(p_customer_address, ''))) < 1 then
    raise exception 'Customer address is required.';
  end if;

  select *
    into v_product
    from public.products
    where id = p_product_id
    for update;

  if not found then
    raise exception 'Product not found.';
  end if;

  if v_product.stock < p_quantity then
    raise exception 'Only % units are available.', v_product.stock;
  end if;

  v_total := v_product.price * p_quantity;
  v_points := greatest(0, (v_product.mrp - v_product.price) * p_quantity);

  begin
    update public.products
      set stock = stock - p_quantity
      where id = v_product.id;

    insert into public.sales (
      id,
      product_id,
      product_name,
      seller,
      customer,
      customer_phone,
      customer_address,
      order_notes,
      quantity,
      unit_price,
      total,
      points,
      broker,
      razorpay_order_id,
      razorpay_payment_id
    )
    values (
      p_order_id,
      v_product.id,
      v_product.name,
      v_product.seller,
      btrim(p_customer),
      btrim(p_customer_phone),
      btrim(p_customer_address),
      btrim(coalesce(p_order_notes, '')),
      p_quantity,
      v_product.price,
      v_total,
      v_points,
      v_broker,
      v_razorpay_order_id,
      v_razorpay_payment_id
    )
    returning * into v_order;
  exception
    when unique_violation then
      select *
        into v_existing
        from public.sales
        where razorpay_payment_id = v_razorpay_payment_id
        limit 1;

      if found then
        return v_existing;
      end if;

      raise;
  end;

  return v_order;
end;
$$;

revoke all on function public.place_paid_order(text, text, text, text, text, text, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.place_paid_order(text, text, text, text, text, text, integer, text, text, text) to service_role;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Profiles are created by the app after authentication through ensureUserProfile().
-- This keeps Google Auth user creation independent from marketplace onboarding details.

insert into public.profiles (
  id,
  role,
  email,
  display_name,
  business_name,
  business_type,
  market,
  onboarding_complete
)
select
  users.id,
  case
    when users.raw_user_meta_data->>'role' in ('seller', 'broker') then users.raw_user_meta_data->>'role'
    else 'seller'
  end as role,
  coalesce(users.email, '') as email,
  nullif(users.raw_user_meta_data->>'full_name', '') as display_name,
  case when users.raw_user_meta_data->>'role' = 'seller' then nullif(users.raw_user_meta_data->>'business_name', '') else null end as business_name,
  case when users.raw_user_meta_data->>'role' = 'seller' then nullif(users.raw_user_meta_data->>'business_type', '') else null end as business_type,
  case when users.raw_user_meta_data->>'role' = 'broker' then nullif(users.raw_user_meta_data->>'market', '') else null end as market,
  (
    (users.raw_user_meta_data->>'role' = 'seller' and nullif(users.raw_user_meta_data->>'business_name', '') is not null)
    or (users.raw_user_meta_data->>'role' = 'broker' and nullif(users.raw_user_meta_data->>'market', '') is not null)
    or exists (select 1 from public.profiles existing where existing.id = users.id and existing.role = 'admin')
  ) as onboarding_complete
from auth.users as users
where not exists (
  select 1 from public.profiles where profiles.id = users.id
);

update public.profiles
set onboarding_complete = true
where role = 'admin'
  or (role = 'seller' and nullif(business_name, '') is not null)
  or (role = 'broker' and nullif(market, '') is not null);

drop policy if exists "profiles read own or admin" on public.profiles;
create policy "profiles read own or admin"
on public.profiles for select
using (id = auth.uid() or public.current_profile_role() = 'admin');

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own"
on public.profiles for insert
with check (id = auth.uid() and role in ('seller', 'broker'));

drop policy if exists "profiles update own display name or admin" on public.profiles;
drop policy if exists "profiles complete own seller broker profile" on public.profiles;
create policy "profiles complete own seller broker profile"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid() and role in ('seller', 'broker') and onboarding_complete = true);

drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update"
on public.profiles for update
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

drop policy if exists "products visible to signed in users" on public.products;
create policy "products visible to signed in users"
on public.products for select
using (auth.role() = 'authenticated' and public.current_profile_onboarded());

drop policy if exists "sellers manage own products" on public.products;
create policy "sellers manage own products"
on public.products for all
using (public.current_profile_role() = 'seller' and seller = public.current_profile_name())
with check (public.current_profile_role() = 'seller' and seller = public.current_profile_name());

drop policy if exists "admins manage products" on public.products;
create policy "admins manage products"
on public.products for all
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

drop policy if exists "sales visible by owner role" on public.sales;
create policy "sales visible by owner role"
on public.sales for select
using (
  public.current_profile_role() = 'admin'
  or (public.current_profile_role() = 'seller' and seller = public.current_profile_name())
  or (public.current_profile_role() = 'broker' and broker = public.current_profile_name())
);

drop policy if exists "brokers create own sales" on public.sales;
-- Sales are created only by the server-side paid-order flow after Razorpay verification.

drop policy if exists "claims visible by owner role" on public.claims;
create policy "claims visible by owner role"
on public.claims for select
using (
  public.current_profile_role() = 'admin'
  or (public.current_profile_role() = 'broker' and broker = public.current_profile_name())
);

drop policy if exists "brokers create own claims" on public.claims;
create policy "brokers create own claims"
on public.claims for insert
with check (public.current_profile_role() = 'broker' and broker = public.current_profile_name());

drop policy if exists "admins update claims" on public.claims;
create policy "admins update claims"
on public.claims for update
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

drop policy if exists "activity visible to signed in users" on public.activity;
create policy "activity visible to signed in users"
on public.activity for select
using (auth.role() = 'authenticated');

drop policy if exists "signed in users create activity" on public.activity;
create policy "signed in users create activity"
on public.activity for insert
with check (auth.role() = 'authenticated');
