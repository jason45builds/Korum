-- Migration 018: Vendor inventory + GST + product catalog
-- Vendors upload products; captains browse and add to team procurement lists

-- GST field on vendors table
alter table public.vendors
  add column if not exists gst_number  text,
  add column if not exists gst_verified boolean not null default false,
  add column if not exists logo_url    text,
  add column if not exists banner_url  text,
  add column if not exists rating      numeric(3,2) default 0,
  add column if not exists review_count int default 0;

-- Vendor inventory / product catalog
create table if not exists public.vendor_products (
  id            uuid         primary key default gen_random_uuid(),
  vendor_id     uuid         not null references public.vendors(id) on delete cascade,
  name          text         not null,
  description   text,
  category      text         not null, -- 'Kit','Equipment','Food',etc
  price         numeric(10,2) not null check (price >= 0),
  unit          text         not null default 'item', -- 'item','kg','pair','set'
  min_qty       int          not null default 1,
  stock         int,                        -- null = unlimited
  image_urls    text[]       not null default '{}',
  is_active     boolean      not null default true,
  sport_tags    text[]       not null default '{}',
  created_at    timestamptz  not null default timezone('utc', now()),
  updated_at    timestamptz  not null default timezone('utc', now())
);
create index if not exists vp_vendor_idx on public.vendor_products(vendor_id, is_active);
alter table public.vendor_products enable row level security;
drop policy if exists "vp_select_all"    on public.vendor_products;
drop policy if exists "vp_write_vendor"  on public.vendor_products;
create policy "vp_select_all"   on public.vendor_products for select using (is_active = true);
create policy "vp_write_vendor" on public.vendor_products for all to authenticated
  using (
    exists (select 1 from public.vendors v where v.id = vendor_id and v.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.vendors v where v.id = vendor_id and v.owner_id = auth.uid())
  );

-- Link procurement items to vendor products
alter table public.procurement_items
  add column if not exists product_id uuid references public.vendor_products(id) on delete set null,
  add column if not exists unit_price  numeric(10,2),
  add column if not exists quantity    int not null default 1;

-- Vendor order requests (when captain places an order)
create table if not exists public.vendor_orders (
  id            uuid         primary key default gen_random_uuid(),
  vendor_id     uuid         not null references public.vendors(id) on delete cascade,
  team_id       uuid         references public.teams(id) on delete set null,
  match_id      uuid         references public.matches(id) on delete set null,
  captain_id    uuid         not null references public.users(id),
  status        text         not null default 'PENDING'
                             check (status in ('PENDING','ACCEPTED','DISPATCHED','DELIVERED','CANCELLED')),
  total_amount  numeric(10,2) not null default 0,
  notes         text,
  created_at    timestamptz  not null default timezone('utc', now()),
  updated_at    timestamptz  not null default timezone('utc', now())
);
create table if not exists public.vendor_order_items (
  id          uuid         primary key default gen_random_uuid(),
  order_id    uuid         not null references public.vendor_orders(id) on delete cascade,
  product_id  uuid         not null references public.vendor_products(id),
  quantity    int          not null default 1,
  unit_price  numeric(10,2) not null,
  subtotal    numeric(10,2) generated always as (quantity * unit_price) stored
);
alter table public.vendor_orders       enable row level security;
alter table public.vendor_order_items  enable row level security;
drop policy if exists "vo_parties"     on public.vendor_orders;
drop policy if exists "voi_parties"    on public.vendor_order_items;
create policy "vo_parties" on public.vendor_orders for all to authenticated
  using (
    captain_id = auth.uid()
    or exists (select 1 from public.vendors v where v.id = vendor_id and v.owner_id = auth.uid())
  );
create policy "voi_parties" on public.vendor_order_items for all to authenticated
  using (
    exists (
      select 1 from public.vendor_orders vo where vo.id = order_id
      and (
        vo.captain_id = auth.uid()
        or exists (select 1 from public.vendors v where v.id = vo.vendor_id and v.owner_id = auth.uid())
      )
    )
  );

-- Ground reviews
create table if not exists public.ground_reviews (
  id          uuid         primary key default gen_random_uuid(),
  ground_id   uuid         not null references public.grounds(id) on delete cascade,
  user_id     uuid         not null references public.users(id) on delete cascade,
  rating      int          not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz  not null default timezone('utc', now()),
  unique(ground_id, user_id)
);
alter table public.ground_reviews enable row level security;
create policy "gr_select_all" on public.ground_reviews for select using (true);
create policy "gr_write_self" on public.ground_reviews for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
