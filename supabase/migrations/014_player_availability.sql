-- ─── Migration 014: Player-initiated availability ──────────────────────────
-- Lets players proactively mark their own availability per team per date
-- Captains query this when checking who can play before creating a match

create table if not exists public.player_availability (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.users (id) on delete cascade,
  team_id      uuid        not null references public.teams (id) on delete cascade,
  match_date   date        not null,
  match_time   time,
  status       text        not null default 'AVAILABLE'
               check (status in ('AVAILABLE', 'UNAVAILABLE', 'MAYBE')),
  created_at   timestamptz not null default timezone('utc', now()),
  updated_at   timestamptz not null default timezone('utc', now()),
  unique (user_id, team_id, match_date)
);

create index if not exists player_avail_user_idx on public.player_availability (user_id);
create index if not exists player_avail_team_idx on public.player_availability (team_id, match_date);

drop trigger if exists player_avail_touch_updated_at on public.player_availability;
create trigger player_avail_touch_updated_at
  before update on public.player_availability
  for each row execute function public.touch_updated_at();

alter table public.player_availability enable row level security;

-- Player can read/write their own entries
drop policy if exists "player_avail_select_self" on public.player_availability;
drop policy if exists "player_avail_write_self"  on public.player_availability;

create policy "player_avail_select_self" on public.player_availability
  for select to authenticated
  using (user_id = auth.uid() or public.is_team_member(team_id));

create policy "player_avail_write_self" on public.player_availability
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
