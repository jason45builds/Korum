-- ─── Migration 016: Vendors, Grounds, Organizers, Sponsors ──────────────────
-- Four new entity types that attach to the sports ecosystem
-- Vendors: kit suppliers, food stalls, equipment hire
-- Grounds: venues that teams can book
-- Organizers: tournament / league organizers
-- Sponsors: brands who want to reach amateur sports communities

-- ── Ground owners / venues ──────────────────────────────────────────────────
create table if not exists public.grounds (
  id             uuid         primary key default gen_random_uuid(),
  owner_id       uuid         references public.users(id) on delete set null,
  name           text         not null,
  sport          text[],
  address        text         not null,
  city           text         not null,
  state          text,
  lat            numeric(9,6),
  lng            numeric(9,6),
  price_per_hour numeric(10,2),
  capacity       int,
  surface        text,
  amenities      text[],
  photos         text[],
  contact_phone  text,
  contact_email  text,
  is_verified    boolean      not null default false,
  is_active      boolean      not null default true,
  created_at     timestamptz  not null default timezone('utc', now()),
  updated_at     timestamptz  not null default timezone('utc', now())
);
create index if not exists grounds_city_idx  on public.grounds(city);
create index if not exists grounds_latng_idx on public.grounds(lat, lng);
alter table public.grounds enable row level security;
drop policy if exists "grounds_select_all"  on public.grounds;
drop policy if exists "grounds_write_owner" on public.grounds;
create policy "grounds_select_all"  on public.grounds for select using (is_active = true);
create policy "grounds_write_owner" on public.grounds for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ── Ground bookings ──────────────────────────────────────────────────────────
create table if not exists public.ground_bookings (
  id          uuid         primary key default gen_random_uuid(),
  ground_id   uuid         not null references public.grounds(id) on delete cascade,
  match_id    uuid         references public.matches(id) on delete set null,
  booked_by   uuid         not null references public.users(id),
  team_id     uuid         references public.teams(id),
  starts_at   timestamptz  not null,
  ends_at     timestamptz  not null,
  hours       numeric(4,1) generated always as (extract(epoch from (ends_at - starts_at)) / 3600) stored,
  total_cost  numeric(10,2),
  status      text         not null default 'PENDING' check (status in ('PENDING','CONFIRMED','CANCELLED')),
  notes       text,
  created_at  timestamptz  not null default timezone('utc', now())
);
alter table public.ground_bookings enable row level security;
drop policy if exists "bookings_select_own"  on public.ground_bookings;
drop policy if exists "bookings_insert_auth" on public.ground_bookings;
create policy "bookings_select_own"  on public.ground_bookings for select to authenticated using (booked_by = auth.uid());
create policy "bookings_insert_auth" on public.ground_bookings for insert to authenticated with check (booked_by = auth.uid());

-- ── Vendors ──────────────────────────────────────────────────────────────────
create table if not exists public.vendors (
  id            uuid         primary key default gen_random_uuid(),
  owner_id      uuid         references public.users(id) on delete set null,
  name          text         not null,
  category      text         not null check (category in ('Kit','Equipment','Food','Photography','Physio','Transport','Other')),
  description   text,
  city          text         not null,
  lat           numeric(9,6),
  lng           numeric(9,6),
  contact_phone text,
  contact_email text,
  website       text,
  photos        text[],
  price_note    text,
  sports        text[],
  is_verified   boolean      not null default false,
  is_active     boolean      not null default true,
  created_at    timestamptz  not null default timezone('utc', now()),
  updated_at    timestamptz  not null default timezone('utc', now())
);
create index if not exists vendors_city_idx     on public.vendors(city);
create index if not exists vendors_category_idx on public.vendors(category);
alter table public.vendors enable row level security;
drop policy if exists "vendors_select_all"  on public.vendors;
drop policy if exists "vendors_write_owner" on public.vendors;
create policy "vendors_select_all"  on public.vendors for select using (is_active = true);
create policy "vendors_write_owner" on public.vendors for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ── Team procurement lists ────────────────────────────────────────────────────
create table if not exists public.procurement_lists (
  id          uuid         primary key default gen_random_uuid(),
  team_id     uuid         not null references public.teams(id) on delete cascade,
  match_id    uuid         references public.matches(id) on delete set null,
  title       text         not null,
  created_by  uuid         not null references public.users(id),
  status      text         not null default 'OPEN' check (status in ('OPEN','FUNDED','CLOSED')),
  created_at  timestamptz  not null default timezone('utc', now())
);

create table if not exists public.procurement_items (
  id               uuid         primary key default gen_random_uuid(),
  list_id          uuid         not null references public.procurement_lists(id) on delete cascade,
  vendor_id        uuid         references public.vendors(id) on delete set null,
  name             text         not null,
  description      text,
  estimated_cost   numeric(10,2),
  target_amount    numeric(10,2),
  collected_amount numeric(10,2) not null default 0,
  created_by       uuid         not null references public.users(id),
  created_at       timestamptz  not null default timezone('utc', now())
);

create table if not exists public.procurement_votes (
  id          uuid         primary key default gen_random_uuid(),
  item_id     uuid         not null references public.procurement_items(id) on delete cascade,
  user_id     uuid         not null references public.users(id) on delete cascade,
  vote        text         not null check (vote in ('NEEDED','NOT_NEEDED')),
  created_at  timestamptz  not null default timezone('utc', now()),
  unique(item_id, user_id)
);

create table if not exists public.procurement_contributions (
  id          uuid         primary key default gen_random_uuid(),
  item_id     uuid         not null references public.procurement_items(id) on delete cascade,
  user_id     uuid         not null references public.users(id) on delete cascade,
  amount      numeric(10,2) not null check (amount > 0),
  note        text,
  created_at  timestamptz  not null default timezone('utc', now())
);

alter table public.procurement_lists         enable row level security;
alter table public.procurement_items         enable row level security;
alter table public.procurement_votes         enable row level security;
alter table public.procurement_contributions enable row level security;

drop policy if exists "proc_list_team"    on public.procurement_lists;
drop policy if exists "proc_item_team"    on public.procurement_items;
drop policy if exists "proc_vote_self"    on public.procurement_votes;
drop policy if exists "proc_contrib_self" on public.procurement_contributions;

create policy "proc_list_team" on public.procurement_lists
  for all to authenticated using (public.is_team_member(team_id));
create policy "proc_item_team" on public.procurement_items
  for all to authenticated using (
    exists (
      select 1 from public.procurement_lists pl
      where pl.id = list_id and public.is_team_member(pl.team_id)
    )
  );
create policy "proc_vote_self" on public.procurement_votes
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "proc_contrib_self" on public.procurement_contributions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── Organizers ───────────────────────────────────────────────────────────────
create table if not exists public.organizers (
  id            uuid         primary key default gen_random_uuid(),
  owner_id      uuid         references public.users(id) on delete set null,
  name          text         not null,
  description   text,
  city          text         not null,
  sports        text[],
  contact_phone text,
  contact_email text,
  website       text,
  logo_url      text,
  is_verified   boolean      not null default false,
  is_active     boolean      not null default true,
  created_at    timestamptz  not null default timezone('utc', now())
);
alter table public.organizers enable row level security;
drop policy if exists "organizers_select" on public.organizers;
drop policy if exists "organizers_write"  on public.organizers;
create policy "organizers_select" on public.organizers for select using (is_active = true);
create policy "organizers_write"  on public.organizers for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ── Sponsors ─────────────────────────────────────────────────────────────────
create table if not exists public.sponsors (
  id            uuid         primary key default gen_random_uuid(),
  owner_id      uuid         references public.users(id) on delete set null,
  brand_name    text         not null,
  tagline       text,
  description   text,
  logo_url      text,
  website       text,
  contact_email text,
  cities        text[],
  sports        text[],
  budget_tier   text         check (budget_tier in ('MICRO','SMALL','MEDIUM','LARGE')),
  is_active     boolean      not null default true,
  created_at    timestamptz  not null default timezone('utc', now())
);
alter table public.sponsors enable row level security;
drop policy if exists "sponsors_select" on public.sponsors;
drop policy if exists "sponsors_write"  on public.sponsors;
create policy "sponsors_select" on public.sponsors for select using (is_active = true);
create policy "sponsors_write"  on public.sponsors for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ── Sponsorship requests ──────────────────────────────────────────────────────
create table if not exists public.sponsorship_requests (
  id          uuid         primary key default gen_random_uuid(),
  sponsor_id  uuid         not null references public.sponsors(id) on delete cascade,
  team_id     uuid         references public.teams(id) on delete cascade,
  match_id    uuid         references public.matches(id) on delete cascade,
  message     text,
  status      text         not null default 'PENDING' check (status in ('PENDING','ACCEPTED','DECLINED')),
  created_at  timestamptz  not null default timezone('utc', now())
);
alter table public.sponsorship_requests enable row level security;
drop policy if exists "spon_req_parties" on public.sponsorship_requests;
create policy "spon_req_parties" on public.sponsorship_requests
  for all to authenticated
  using (
    exists (select 1 from public.sponsors s where s.id = sponsor_id and s.owner_id = auth.uid())
    or public.is_team_member(team_id)
  );

-- ── increment_collected: updates collected_amount on a procurement item ───────
create or replace function public.increment_collected(
  p_item_id uuid,
  p_amount  numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.procurement_items
  set collected_amount = collected_amount + p_amount
  where id = p_item_id;
end;
$$;
