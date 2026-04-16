create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sport text not null,
  city text not null,
  captain_id uuid not null references public.users (id) on delete restrict,
  invite_code text not null unique default public.generate_short_code(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists teams_captain_idx on public.teams (captain_id);
create index if not exists teams_sport_city_idx on public.teams (sport, city);

drop trigger if exists teams_touch_updated_at on public.teams;
create trigger teams_touch_updated_at
before update on public.teams
for each row
execute function public.touch_updated_at();

alter table public.teams enable row level security;

drop policy if exists "teams_select_authenticated" on public.teams;
create policy "teams_select_authenticated"
on public.teams
for select
to authenticated
using (true);

drop policy if exists "teams_insert_captain" on public.teams;
create policy "teams_insert_captain"
on public.teams
for insert
to authenticated
with check (captain_id = auth.uid());

drop policy if exists "teams_update_captain" on public.teams;
create policy "teams_update_captain"
on public.teams
for update
to authenticated
using (captain_id = auth.uid())
with check (captain_id = auth.uid());
