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
  payout_account_name text,
  payout_bank_name text,
  payout_account_number text,
  payout_ifsc text,
  payout_upi text,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.profiles add column if not exists business_name text;
alter table public.profiles add column if not exists business_type text;
alter table public.profiles add column if not exists market text;
alter table public.profiles add column if not exists payout_account_name text;
alter table public.profiles add column if not exists payout_bank_name text;
alter table public.profiles add column if not exists payout_account_number text;
alter table public.profiles add column if not exists payout_ifsc text;
alter table public.profiles add column if not exists payout_upi text;
alter table public.profiles add column if not exists onboarding_complete boolean not null default false;

create table if not exists public.categories (
  key text primary key,
  name text not null,
  source text not null default 'admin',
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint categories_key_check check (char_length(key) between 1 and 80 and key = lower(regexp_replace(btrim(key), '[[:space:]]+', ' ', 'g'))),
  constraint categories_name_check check (char_length(btrim(name)) between 1 and 80),
  constraint categories_source_check check (source in ('admin', 'baapstore', 'seed', 'legacy'))
);

alter table public.categories add column if not exists source text not null default 'admin';
alter table public.categories add column if not exists created_at timestamptz not null default timezone('utc'::text, now());

create table if not exists public.products (
  id text primary key,
  name text not null check (char_length(name) between 1 and 120),
  category text not null check (char_length(category) between 1 and 80),
  mrp numeric(12, 2) not null check (mrp > 0),
  price numeric(12, 2) not null check (price > 0 and price <= mrp),
  commission numeric(12, 2) not null default 0,
  stock integer not null default 0 check (stock >= 0),
  seller text not null,
  image text,
  description text not null default '',
  option_label text not null default '',
  option_values text[] not null default '{}',
  option_groups jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint products_commission_check check (commission >= 0 and commission <= mrp)
);

alter table public.products add column if not exists commission numeric(12, 2);
alter table public.products add column if not exists option_label text not null default '';
alter table public.products add column if not exists option_values text[] not null default '{}';
alter table public.products add column if not exists option_groups jsonb not null default '[]'::jsonb;
update public.products
set option_groups = jsonb_build_array(jsonb_build_object(
  'label', coalesce(nullif(btrim(option_label), ''), 'Option'),
  'values', to_jsonb(option_values)
))
where jsonb_array_length(option_groups) = 0
  and cardinality(option_values) > 0;
update public.products set option_groups = '[]'::jsonb where option_groups is null;
alter table public.products alter column option_groups set default '[]'::jsonb;
alter table public.products alter column option_groups set not null;
update public.products
set commission = greatest(0, mrp - price)
where commission is null;
alter table public.products alter column commission set default 0;
alter table public.products alter column commission set not null;
do $$
begin
  alter table public.products add constraint products_commission_check check (commission >= 0 and commission <= mrp);
exception
  when duplicate_object then null;
end $$;
comment on column public.products.price is 'Legacy selling-price column retained for compatibility. Current app uses mrp for order totals and commission for broker rewards.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_option_groups_array_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_option_groups_array_check
      check (jsonb_typeof(option_groups) = 'array');
  end if;
end $$;

create table if not exists public.sales (
  id text primary key,
  product_id text not null references public.products(id) on delete restrict,
  product_name text not null,
  seller text not null,
  customer text not null check (char_length(customer) between 1 and 120),
  customer_phone text not null default '',
  customer_address text not null default '',
  order_notes text not null default '',
  selected_option_label text not null default '',
  selected_option_value text not null default '',
  selected_options jsonb not null default '[]'::jsonb,
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
alter table public.sales add column if not exists selected_option_label text not null default '';
alter table public.sales add column if not exists selected_option_value text not null default '';
alter table public.sales add column if not exists selected_options jsonb not null default '[]'::jsonb;
update public.sales
set selected_options = jsonb_build_array(jsonb_build_object(
  'label', coalesce(nullif(btrim(selected_option_label), ''), 'Option'),
  'value', btrim(selected_option_value)
))
where jsonb_array_length(selected_options) = 0
  and char_length(btrim(selected_option_value)) > 0;
update public.sales set selected_options = '[]'::jsonb where selected_options is null;
alter table public.sales alter column selected_options set default '[]'::jsonb;
alter table public.sales alter column selected_options set not null;
alter table public.sales add column if not exists razorpay_order_id text;
alter table public.sales add column if not exists razorpay_payment_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'sales_selected_options_array_check'
      and conrelid = 'public.sales'::regclass
  ) then
    alter table public.sales
      add constraint sales_selected_options_array_check
      check (jsonb_typeof(selected_options) = 'array');
  end if;
end $$;

create table if not exists public.claims (
  id text primary key,
  broker text not null,
  points numeric(12, 2) not null check (points > 0),
  payout_account_name text,
  payout_bank_name text,
  payout_account_number text,
  payout_ifsc text,
  payout_upi text,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.claims add column if not exists payout_account_name text;
alter table public.claims add column if not exists payout_bank_name text;
alter table public.claims add column if not exists payout_account_number text;
alter table public.claims add column if not exists payout_ifsc text;
alter table public.claims add column if not exists payout_upi text;

create table if not exists public.activity (
  id text primary key,
  type text not null check (type in ('sale', 'product')),
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default timezone('utc'::text, now())
);

insert into public.categories (key, name, source)
select
  lower(regexp_replace(btrim(category_name), '[[:space:]]+', ' ', 'g')),
  btrim(category_name),
  'seed'
from unnest(array[
  'Clothing', 'Accessories', 'Footwear', 'Beauty & Personal Care', 'Electronics',
  'Mobiles & Gadgets', 'Home & Living', 'Kitchen & Dining', 'Furniture',
  'Food & Beverages', 'Grocery & Staples', 'Health & Wellness', 'Baby & Kids',
  'Toys & Games', 'Books & Stationery', 'Sports & Fitness', 'Automotive',
  'Hardware & Tools', 'Jewellery', 'Bags & Luggage', 'Pet Supplies',
  'Office Supplies', 'Other'
]) as defaults(category_name)
on conflict (key) do nothing;

insert into public.categories (key, name, source)
select distinct
  lower(regexp_replace(btrim(category), '[[:space:]]+', ' ', 'g')),
  regexp_replace(btrim(category), '[[:space:]]+', ' ', 'g'),
  'legacy'
from public.products
where char_length(btrim(category)) between 1 and 80
on conflict (key) do nothing;

create index if not exists products_seller_idx on public.products (seller);
create index if not exists products_seller_created_at_idx on public.products (seller, created_at desc);
create index if not exists products_category_idx on public.products (category);
create index if not exists sales_broker_idx on public.sales (broker);
create index if not exists sales_seller_idx on public.sales (seller);
create index if not exists sales_broker_created_at_idx on public.sales (broker, created_at desc);
create index if not exists sales_seller_created_at_idx on public.sales (seller, created_at desc);
create unique index if not exists sales_razorpay_payment_id_key on public.sales (razorpay_payment_id) where razorpay_payment_id is not null;
create unique index if not exists sales_razorpay_order_id_key on public.sales (razorpay_order_id) where razorpay_order_id is not null;
create index if not exists claims_broker_idx on public.claims (broker);
create index if not exists claims_broker_created_at_idx on public.claims (broker, created_at desc);
create index if not exists claims_status_created_at_idx on public.claims (status, created_at desc);
create index if not exists activity_created_at_idx on public.activity (created_at desc);

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
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

create or replace function public.profile_has_payout_details(
  p_account_name text,
  p_bank_name text,
  p_account_number text,
  p_ifsc text,
  p_upi text
)
returns boolean
language sql
immutable
as $$
  select
    char_length(btrim(coalesce(p_account_name, ''))) > 0
    and (
      char_length(btrim(coalesce(p_upi, ''))) > 0
      or (
        char_length(btrim(coalesce(p_bank_name, ''))) > 0
        and char_length(btrim(coalesce(p_account_number, ''))) > 0
        and char_length(btrim(coalesce(p_ifsc, ''))) > 0
      )
    )
$$;

drop function if exists public.place_order(text, text, text, text, text, text, integer);
create or replace function public.place_order(
  p_order_id text,
  p_product_id text,
  p_customer text,
  p_customer_phone text,
  p_customer_address text,
  p_order_notes text,
  p_selected_option_label text,
  p_selected_option_value text,
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
  if jsonb_array_length(v_product.option_groups) > 1 then
    raise exception 'This product has multiple required choices. Update the app before placing this order.';
  end if;
  if cardinality(v_product.option_values) > 0 and not (btrim(coalesce(p_selected_option_value, '')) = any(v_product.option_values)) then
    raise exception 'Select a valid %.', coalesce(nullif(v_product.option_label, ''), 'product option');
  end if;

  v_broker := public.current_profile_name();
  v_total := (v_product.mrp * p_quantity) + 50;
  v_points := greatest(0, v_product.commission * p_quantity);

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
    selected_option_label,
    selected_option_value,
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
    case when cardinality(v_product.option_values) > 0 then v_product.option_label else '' end,
    case when cardinality(v_product.option_values) > 0 then btrim(p_selected_option_value) else '' end,
    p_quantity,
    v_product.mrp,
    v_total,
    v_points,
    v_broker
  )
  returning * into v_order;

  return v_order;
end;
$$;

revoke all on function public.place_order(text, text, text, text, text, text, text, text, integer) from public, anon, authenticated;

drop function if exists public.place_paid_order(text, text, text, text, text, text, integer, text, text, text);
create or replace function public.place_paid_order(
  p_order_id text,
  p_product_id text,
  p_customer text,
  p_customer_phone text,
  p_customer_address text,
  p_order_notes text,
  p_selected_option_label text,
  p_selected_option_value text,
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
  if jsonb_array_length(v_product.option_groups) > 1 then
    raise exception 'This product has multiple required choices. Update the app before placing this order.';
  end if;
  if cardinality(v_product.option_values) > 0 and not (btrim(coalesce(p_selected_option_value, '')) = any(v_product.option_values)) then
    raise exception 'Select a valid %.', coalesce(nullif(v_product.option_label, ''), 'product option');
  end if;

  v_total := (v_product.mrp * p_quantity) + 50;
  v_points := greatest(0, v_product.commission * p_quantity);

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
      selected_option_label,
      selected_option_value,
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
      case when cardinality(v_product.option_values) > 0 then v_product.option_label else '' end,
      case when cardinality(v_product.option_values) > 0 then btrim(p_selected_option_value) else '' end,
      p_quantity,
      v_product.mrp,
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

revoke all on function public.place_paid_order(text, text, text, text, text, text, text, text, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.place_paid_order(text, text, text, text, text, text, text, text, integer, text, text, text) to service_role;

create or replace function public.product_option_selections_are_valid(
  p_option_groups jsonb,
  p_selected_options jsonb
)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  v_groups jsonb := coalesce(p_option_groups, '[]'::jsonb);
  v_selections jsonb := coalesce(p_selected_options, '[]'::jsonb);
  v_group jsonb;
  v_label text;
  v_seen_labels text[] := '{}';
  v_matches integer;
begin
  if jsonb_typeof(v_groups) <> 'array' or jsonb_typeof(v_selections) <> 'array' then
    return false;
  end if;

  if jsonb_array_length(v_groups) <> jsonb_array_length(v_selections) then
    return false;
  end if;

  for v_group in select value from jsonb_array_elements(v_groups)
  loop
    if jsonb_typeof(v_group) <> 'object' or jsonb_typeof(v_group->'values') <> 'array' then
      return false;
    end if;

    v_label := lower(btrim(coalesce(v_group->>'label', '')));
    if char_length(v_label) < 1 or v_label = any(v_seen_labels) or jsonb_array_length(v_group->'values') < 1 then
      return false;
    end if;
    v_seen_labels := array_append(v_seen_labels, v_label);

    select count(*)
      into v_matches
      from jsonb_array_elements(v_selections) as candidate(item)
      where jsonb_typeof(candidate.item) = 'object'
        and lower(btrim(coalesce(candidate.item->>'label', ''))) = v_label
        and exists (
          select 1
          from jsonb_array_elements_text(v_group->'values') as allowed(value)
          where allowed.value = btrim(coalesce(candidate.item->>'value', ''))
        );

    if v_matches <> 1 then
      return false;
    end if;
  end loop;

  return true;
exception
  when others then return false;
end;
$$;

revoke all on function public.product_option_selections_are_valid(jsonb, jsonb) from public, anon, authenticated;

drop function if exists public.place_order_v2(text, text, text, text, text, text, jsonb, integer);
create or replace function public.place_order_v2(
  p_order_id text,
  p_product_id text,
  p_customer text,
  p_customer_phone text,
  p_customer_address text,
  p_order_notes text,
  p_selected_options jsonb,
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
  v_option_groups jsonb;
  v_selected_options jsonb;
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
  if char_length(btrim(coalesce(p_customer, ''))) < 1 then raise exception 'Customer name is required.'; end if;
  if char_length(btrim(coalesce(p_customer_phone, ''))) < 1 then raise exception 'Customer phone is required.'; end if;
  if char_length(btrim(coalesce(p_customer_address, ''))) < 1 then raise exception 'Customer address is required.'; end if;

  select * into v_product from public.products where id = p_product_id for update;
  if not found then raise exception 'Product not found.'; end if;
  if v_product.stock < p_quantity then raise exception 'Only % units are available.', v_product.stock; end if;

  v_option_groups := case
    when jsonb_array_length(v_product.option_groups) > 0 then v_product.option_groups
    when cardinality(v_product.option_values) > 0 then jsonb_build_array(jsonb_build_object(
      'label', coalesce(nullif(btrim(v_product.option_label), ''), 'Option'),
      'values', to_jsonb(v_product.option_values)
    ))
    else '[]'::jsonb
  end;

  if not public.product_option_selections_are_valid(v_option_groups, p_selected_options) then
    raise exception 'Select one valid choice for every product option.';
  end if;

  select coalesce(jsonb_agg(
      jsonb_build_object('label', btrim(group_row.item->>'label'), 'value', btrim(selection_row.item->>'value'))
      order by group_row.position
    ), '[]'::jsonb)
    into v_selected_options
    from jsonb_array_elements(v_option_groups) with ordinality as group_row(item, position)
    join lateral (
      select candidate.item
      from jsonb_array_elements(coalesce(p_selected_options, '[]'::jsonb)) as candidate(item)
      where lower(btrim(candidate.item->>'label')) = lower(btrim(group_row.item->>'label'))
      limit 1
    ) as selection_row on true;

  v_broker := public.current_profile_name();
  v_total := (v_product.mrp * p_quantity) + 50;
  v_points := greatest(0, v_product.commission * p_quantity);

  update public.products set stock = stock - p_quantity where id = v_product.id;
  insert into public.sales (
    id, product_id, product_name, seller, customer, customer_phone, customer_address,
    order_notes, selected_option_label, selected_option_value, selected_options,
    quantity, unit_price, total, points, broker
  ) values (
    p_order_id, v_product.id, v_product.name, v_product.seller, btrim(p_customer),
    btrim(p_customer_phone), btrim(p_customer_address), btrim(coalesce(p_order_notes, '')),
    coalesce((v_selected_options->0)->>'label', ''),
    coalesce((v_selected_options->0)->>'value', ''),
    v_selected_options, p_quantity, v_product.mrp, v_total, v_points, v_broker
  ) returning * into v_order;

  return v_order;
end;
$$;

revoke all on function public.place_order_v2(text, text, text, text, text, text, jsonb, integer) from public, anon, authenticated;

drop function if exists public.place_paid_order_v2(text, text, text, text, text, text, jsonb, integer, text, text, text);
create or replace function public.place_paid_order_v2(
  p_order_id text,
  p_product_id text,
  p_customer text,
  p_customer_phone text,
  p_customer_address text,
  p_order_notes text,
  p_selected_options jsonb,
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
  v_broker text := btrim(coalesce(p_broker, ''));
  v_total numeric(12, 2);
  v_points numeric(12, 2);
  v_razorpay_order_id text := btrim(coalesce(p_razorpay_order_id, ''));
  v_razorpay_payment_id text := btrim(coalesce(p_razorpay_payment_id, ''));
  v_option_groups jsonb;
  v_selected_options jsonb;
begin
  if char_length(v_broker) < 1 then raise exception 'Broker identity is required.'; end if;
  if char_length(v_razorpay_order_id) < 1 or char_length(v_razorpay_payment_id) < 1 then
    raise exception 'Razorpay payment identifiers are required.';
  end if;

  select * into v_existing from public.sales where razorpay_payment_id = v_razorpay_payment_id limit 1;
  if found then return v_existing; end if;

  if p_quantity is null or p_quantity < 1 then raise exception 'Enter a valid order quantity.'; end if;
  if char_length(btrim(coalesce(p_customer, ''))) < 1 then raise exception 'Customer name is required.'; end if;
  if char_length(btrim(coalesce(p_customer_phone, ''))) < 1 then raise exception 'Customer phone is required.'; end if;
  if char_length(btrim(coalesce(p_customer_address, ''))) < 1 then raise exception 'Customer address is required.'; end if;

  select * into v_product from public.products where id = p_product_id for update;
  if not found then raise exception 'Product not found.'; end if;
  if v_product.stock < p_quantity then raise exception 'Only % units are available.', v_product.stock; end if;

  v_option_groups := case
    when jsonb_array_length(v_product.option_groups) > 0 then v_product.option_groups
    when cardinality(v_product.option_values) > 0 then jsonb_build_array(jsonb_build_object(
      'label', coalesce(nullif(btrim(v_product.option_label), ''), 'Option'),
      'values', to_jsonb(v_product.option_values)
    ))
    else '[]'::jsonb
  end;

  if not public.product_option_selections_are_valid(v_option_groups, p_selected_options) then
    raise exception 'Select one valid choice for every product option.';
  end if;

  select coalesce(jsonb_agg(
      jsonb_build_object('label', btrim(group_row.item->>'label'), 'value', btrim(selection_row.item->>'value'))
      order by group_row.position
    ), '[]'::jsonb)
    into v_selected_options
    from jsonb_array_elements(v_option_groups) with ordinality as group_row(item, position)
    join lateral (
      select candidate.item
      from jsonb_array_elements(coalesce(p_selected_options, '[]'::jsonb)) as candidate(item)
      where lower(btrim(candidate.item->>'label')) = lower(btrim(group_row.item->>'label'))
      limit 1
    ) as selection_row on true;

  v_total := (v_product.mrp * p_quantity) + 50;
  v_points := greatest(0, v_product.commission * p_quantity);

  begin
    update public.products set stock = stock - p_quantity where id = v_product.id;
    insert into public.sales (
      id, product_id, product_name, seller, customer, customer_phone, customer_address,
      order_notes, selected_option_label, selected_option_value, selected_options,
      quantity, unit_price, total, points, broker, razorpay_order_id, razorpay_payment_id
    ) values (
      p_order_id, v_product.id, v_product.name, v_product.seller, btrim(p_customer),
      btrim(p_customer_phone), btrim(p_customer_address), btrim(coalesce(p_order_notes, '')),
      coalesce((v_selected_options->0)->>'label', ''),
      coalesce((v_selected_options->0)->>'value', ''),
      v_selected_options, p_quantity, v_product.mrp, v_total, v_points, v_broker,
      v_razorpay_order_id, v_razorpay_payment_id
    ) returning * into v_order;
  exception
    when unique_violation then
      select * into v_existing from public.sales where razorpay_payment_id = v_razorpay_payment_id limit 1;
      if found then return v_existing; end if;
      raise;
  end;

  return v_order;
end;
$$;

revoke all on function public.place_paid_order_v2(text, text, text, text, text, text, jsonb, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.place_paid_order_v2(text, text, text, text, text, text, jsonb, integer, text, text, text) to service_role;

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
  payout_account_name,
  payout_bank_name,
  payout_account_number,
  payout_ifsc,
  payout_upi,
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
  case when users.raw_user_meta_data->>'role' = 'broker' then nullif(users.raw_user_meta_data->>'payout_account_name', '') else null end as payout_account_name,
  case when users.raw_user_meta_data->>'role' = 'broker' then nullif(users.raw_user_meta_data->>'payout_bank_name', '') else null end as payout_bank_name,
  case when users.raw_user_meta_data->>'role' = 'broker' then nullif(users.raw_user_meta_data->>'payout_account_number', '') else null end as payout_account_number,
  case when users.raw_user_meta_data->>'role' = 'broker' then nullif(users.raw_user_meta_data->>'payout_ifsc', '') else null end as payout_ifsc,
  case when users.raw_user_meta_data->>'role' = 'broker' then nullif(users.raw_user_meta_data->>'payout_upi', '') else null end as payout_upi,
  (
    (users.raw_user_meta_data->>'role' = 'seller' and nullif(users.raw_user_meta_data->>'business_name', '') is not null)
    or (
      users.raw_user_meta_data->>'role' = 'broker'
      and nullif(users.raw_user_meta_data->>'market', '') is not null
      and public.profile_has_payout_details(
        users.raw_user_meta_data->>'payout_account_name',
        users.raw_user_meta_data->>'payout_bank_name',
        users.raw_user_meta_data->>'payout_account_number',
        users.raw_user_meta_data->>'payout_ifsc',
        users.raw_user_meta_data->>'payout_upi'
      )
    )
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
  or (
    role = 'broker'
    and nullif(market, '') is not null
    and public.profile_has_payout_details(payout_account_name, payout_bank_name, payout_account_number, payout_ifsc, payout_upi)
  );

update public.profiles
set onboarding_complete = false
where role = 'broker'
  and (
    nullif(market, '') is null
    or public.profile_has_payout_details(payout_account_name, payout_bank_name, payout_account_number, payout_ifsc, payout_upi) = false
  );

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

drop policy if exists "categories visible to signed in users" on public.categories;
create policy "categories visible to signed in users"
on public.categories for select
using (auth.role() = 'authenticated' and public.current_profile_onboarded());

drop policy if exists "admins create categories" on public.categories;
create policy "admins create categories"
on public.categories for insert
with check (public.current_profile_role() = 'admin');

revoke all on table public.categories from anon;
grant select, insert on table public.categories to authenticated;

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
with check (
  public.current_profile_role() = 'broker'
  and broker = public.current_profile_name()
  and public.profile_has_payout_details(payout_account_name, payout_bank_name, payout_account_number, payout_ifsc, payout_upi)
);

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

-- Product binaries belong in Storage so catalog queries only transfer short CDN URLs.
-- The application gracefully falls back to compressed inline images until this migration is applied.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  2097152,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "users upload own product images" on storage.objects;
create policy "users upload own product images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "users delete own product images" on storage.objects;
create policy "users delete own product images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
