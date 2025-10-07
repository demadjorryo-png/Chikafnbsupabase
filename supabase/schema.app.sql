-- App-specific schema for Chika POS

-- Extend profiles with app fields
alter table public.profiles
  add column if not exists name text,
  add column if not exists role text check (role in ('admin','cashier')),
  add column if not exists whatsapp text,
  add column if not exists status text default 'active' check (status in ('active','inactive')),
  add column if not exists store_id uuid;

-- Stores
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null,
  business_description text,
  receipt_settings jsonb default '{}'::jsonb,
  point_earning_settings jsonb default '{}'::jsonb,
  notification_settings jsonb default '{}'::jsonb,
  pradana_token_balance integer default 0,
  admin_uids text[] default '{}',
  created_at timestamptz default now(),
  first_transaction_date timestamptz null,
  transaction_counter integer default 0
);
alter table public.stores enable row level security;

-- Helper functions for RLS
create or replace function public.is_store_admin(store public.stores)
returns boolean language sql stable as $$
  select auth.uid()::text = any (store.admin_uids)
$$;

create or replace function public.belongs_to_store(store_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.store_id = belongs_to_store.store_id
  )
$$;

-- RLS: stores
create policy if not exists stores_select_auth on public.stores for select using (auth.uid() is not null);
create policy if not exists stores_modify_admin on public.stores for all using (public.is_store_admin(stores)) with check (public.is_store_admin(stores));

-- Profiles FK to store
alter table public.profiles
  drop constraint if exists profiles_store_id_fkey,
  add constraint profiles_store_id_fkey foreign key (store_id) references public.stores(id) on delete set null;

-- Products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  category text not null,
  stock integer not null default 0,
  price numeric not null,
  cost_price numeric not null default 0,
  supplier_id text,
  image_url text,
  image_hint text,
  attributes jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
alter table public.products enable row level security;
create policy if not exists products_select_auth on public.products for select using (auth.uid() is not null);
create policy if not exists products_modify_admin on public.products for all using (public.is_store_admin((select s from public.stores s where s.id = products.store_id))) with check (public.is_store_admin((select s from public.stores s where s.id = products.store_id)));
create policy if not exists products_update_staff on public.products for update to authenticated using (public.belongs_to_store(products.store_id)) with check (public.belongs_to_store(products.store_id));

-- Customers
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  phone text not null,
  birth_date date,
  join_date timestamptz,
  loyalty_points integer default 0,
  member_tier text,
  avatar_url text
);
alter table public.customers enable row level security;
create policy if not exists customers_select_auth on public.customers for select using (auth.uid() is not null);
create policy if not exists customers_modify_admin on public.customers for all using (public.is_store_admin((select s from public.stores s where s.id = customers.store_id))) with check (public.is_store_admin((select s from public.stores s where s.id = customers.store_id)));
create policy if not exists customers_insert_staff on public.customers for insert to authenticated with check (public.belongs_to_store(customers.store_id));
create policy if not exists customers_update_staff on public.customers for update to authenticated using (public.belongs_to_store(customers.store_id)) with check (public.belongs_to_store(customers.store_id));

-- Tables (restaurant tables)
create table if not exists public.tables (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  status text not null default 'Tersedia',
  capacity integer not null default 0,
  current_order jsonb
);
alter table public.tables enable row level security;
create policy if not exists tables_select_auth on public.tables for select using (auth.uid() is not null);
create policy if not exists tables_modify_admin on public.tables for all using (public.is_store_admin((select s from public.stores s where s.id = tables.store_id))) with check (public.is_store_admin((select s from public.stores s where s.id = tables.store_id)));
create policy if not exists tables_update_staff on public.tables for update to authenticated using (public.belongs_to_store(tables.store_id)) with check (public.belongs_to_store(tables.store_id));

-- Transactions
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  receipt_number bigint not null,
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text,
  staff_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  subtotal numeric not null,
  discount_amount numeric not null default 0,
  total_amount numeric not null,
  payment_method text,
  points_earned integer default 0,
  points_redeemed integer default 0,
  items jsonb not null,
  table_id uuid references public.tables(id) on delete set null,
  status text
);
alter table public.transactions enable row level security;
create policy if not exists transactions_select_auth on public.transactions for select using (auth.uid() is not null);
create policy if not exists transactions_modify_admin on public.transactions for all using (public.is_store_admin((select s from public.stores s where s.id = transactions.store_id))) with check (public.is_store_admin((select s from public.stores s where s.id = transactions.store_id)));
create policy if not exists transactions_update_staff on public.transactions for update to authenticated using (public.belongs_to_store(transactions.store_id)) with check (public.belongs_to_store(transactions.store_id));

-- Redemption Options
create table if not exists public.redemption_options (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  description text not null,
  points_required integer not null,
  value numeric not null,
  is_active boolean default true
);
alter table public.redemption_options enable row level security;
create policy if not exists ro_select_auth on public.redemption_options for select using (auth.uid() is not null);
create policy if not exists ro_modify_admin on public.redemption_options for all using (public.is_store_admin((select s from public.stores s where s.id = redemption_options.store_id))) with check (public.is_store_admin((select s from public.stores s where s.id = redemption_options.store_id)));

-- Challenge Periods
create table if not exists public.challenge_periods (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  period text not null,
  challenges jsonb not null,
  is_active boolean default false,
  created_at timestamptz default now()
);
alter table public.challenge_periods enable row level security;
create policy if not exists cp_select_auth on public.challenge_periods for select using (auth.uid() is not null);
create policy if not exists cp_modify_admin on public.challenge_periods for all using (public.is_store_admin((select s from public.stores s where s.id = challenge_periods.store_id))) with check (public.is_store_admin((select s from public.stores s where s.id = challenge_periods.store_id)));

-- Top Up Requests
create table if not exists public.top_up_requests (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  store_name text,
  user_id uuid references public.profiles(id) on delete set null,
  user_name text,
  amount numeric not null,
  unique_code integer not null,
  total_amount numeric not null,
  proof_url text,
  status text not null default 'pending',
  requested_at timestamptz default now(),
  processed_at timestamptz
);
alter table public.top_up_requests enable row level security;
create policy if not exists tur_select_auth on public.top_up_requests for select using (auth.uid() is not null);
create policy if not exists tur_modify_admin on public.top_up_requests for all using (public.is_store_admin((select s from public.stores s where s.id = top_up_requests.store_id))) with check (public.is_store_admin((select s from public.stores s where s.id = top_up_requests.store_id)));
create policy if not exists tur_insert_staff on public.top_up_requests for insert to authenticated with check (public.belongs_to_store(top_up_requests.store_id));

-- Applied Strategies
create table if not exists public.applied_strategies (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  type text not null,
  recommendation text not null,
  applied_date date not null,
  status text not null
);
alter table public.applied_strategies enable row level security;
create policy if not exists as_select_auth on public.applied_strategies for select using (auth.uid() is not null);
create policy if not exists as_modify_admin on public.applied_strategies for all using (public.is_store_admin((select s from public.stores s where s.id = applied_strategies.store_id))) with check (public.is_store_admin((select s from public.stores s where s.id = applied_strategies.store_id)));

-- App Settings (global)
create table if not exists public.app_settings (
  id text primary key default 'global',
  data jsonb not null default '{}'::jsonb
);
alter table public.app_settings enable row level security;
create policy if not exists app_settings_select_auth on public.app_settings for select using (auth.uid() is not null);
create policy if not exists app_settings_modify_admin on public.app_settings for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Pending Orders
create table if not exists public.pending_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid,
  customer_name text,
  customer_avatar_url text,
  product_id uuid,
  product_name text,
  quantity integer not null default 1,
  created_at timestamptz default now()
);
alter table public.pending_orders enable row level security;
create policy if not exists po_select_auth on public.pending_orders for select using (auth.uid() is not null);
create policy if not exists po_modify_admin on public.pending_orders for all using (public.is_store_admin((select s from public.stores s where s.id = pending_orders.store_id))) with check (public.is_store_admin((select s from public.stores s where s.id = pending_orders.store_id)));

-- Receipt number helper
create or replace function public.next_receipt_number(p_store_id uuid)
returns bigint
language plpgsql
as $$
declare
  new_number bigint;
begin
  update public.stores
  set transaction_counter = coalesce(transaction_counter, 0) + 1
  where id = p_store_id
  returning transaction_counter into new_number;
  return new_number;
end;
$$;

-- Perform checkout atomically
create or replace function public.perform_checkout(
  p_store_id uuid,
  p_customer_id uuid,
  p_customer_name text,
  p_staff_id uuid,
  p_subtotal numeric,
  p_discount_amount numeric,
  p_total_amount numeric,
  p_payment_method text,
  p_items jsonb,
  p_table_id uuid,
  p_status text default 'Selesai Dibayar'
)
returns table(id uuid, receipt_number bigint)
language plpgsql
as $$
declare
  v_receipt bigint;
  v_id uuid;
  rec jsonb;
  v_product_id uuid;
  v_qty int;
begin
  -- Next receipt number
  v_receipt := public.next_receipt_number(p_store_id);

  -- Insert transaction
  insert into public.transactions (
    store_id, customer_id, customer_name, staff_id,
    subtotal, discount_amount, total_amount, payment_method,
    items, table_id, status, receipt_number, created_at
  ) values (
    p_store_id, p_customer_id, p_customer_name, p_staff_id,
    p_subtotal, p_discount_amount, p_total_amount, p_payment_method,
    p_items, p_table_id, coalesce(p_status, 'Selesai Dibayar'), v_receipt, now()
  ) returning transactions.id into v_id;

  -- Decrement stock per item
  for rec in select jsonb_array_elements(p_items) loop
    begin
      v_product_id := (rec->>'productId')::uuid;
      v_qty := coalesce((rec->>'quantity')::int, 0);
      if v_product_id is not null and v_qty > 0 then
        update public.products
        set stock = greatest(0, stock - v_qty)
        where id = v_product_id and store_id = p_store_id;
      end if;
    exception when others then
      -- ignore malformed entries
      continue;
    end;
  end loop;

  return query select v_id, v_receipt;
end;
$$;
