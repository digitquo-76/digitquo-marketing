-- DigitQuo production schema for Supabase.
-- Run this in the Supabase SQL editor after reviewing the policies for your business rules.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('seller', 'broker', 'admin')),
  email text not null,
  display_name text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

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
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price > 0),
  total numeric(12, 2) not null check (total >= 0),
  points numeric(12, 2) not null check (points >= 0),
  broker text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

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

drop policy if exists "profiles read own or admin" on public.profiles;
create policy "profiles read own or admin"
on public.profiles for select
using (id = auth.uid() or public.current_profile_role() = 'admin');

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own"
on public.profiles for insert
with check (id = auth.uid() and role in ('seller', 'broker'));

drop policy if exists "profiles update own display name or admin" on public.profiles;
create policy "profiles update own display name or admin"
on public.profiles for update
using (id = auth.uid() or public.current_profile_role() = 'admin')
with check (id = auth.uid() or public.current_profile_role() = 'admin');

drop policy if exists "products visible to signed in users" on public.products;
create policy "products visible to signed in users"
on public.products for select
using (auth.role() = 'authenticated');

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
create policy "brokers create own sales"
on public.sales for insert
with check (public.current_profile_role() = 'broker' and broker = public.current_profile_name());

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
