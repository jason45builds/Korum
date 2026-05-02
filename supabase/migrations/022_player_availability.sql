-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 022: Player Availability Calendar
-- Stores player-initiated availability so captains can see who's free
-- without needing to send individual availability check requests.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.player_availability (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.users(id) on delete cascade,
  team_id     uuid        references public.teams(id) on delete cascade,  -- null = all teams
  match_date  date        not null,
  match_time  time,
  status      text        not null check (status in ('AVAILABLE','MAYBE','UNAVAILABLE')),
  note        text,
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now()),
  unique (user_id, team_id, match_date)
);

-- Partial index for null team_id (all-teams availability)
create unique index if not exists player_availability_all_teams_uidx
  on public.player_availability (user_id, match_date)
  where team_id is null;

create index if not exists player_availability_team_date_idx
  on public.player_availability (team_id, match_date)
  where team_id is not null;

create index if not exists player_availability_user_date_idx
  on public.player_availability (user_id, match_date);

-- RLS
alter table public.player_availability enable row level security;

-- Player can see and write their own entries
drop policy if exists "pa_own" on public.player_availability;
create policy "pa_own" on public.player_availability
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Captain/admin of the team can read their team members' availability
drop policy if exists "pa_captain_read" on public.player_availability;
create policy "pa_captain_read" on public.player_availability
  for select to authenticated
  using (
    team_id is null  -- all-teams entries visible to anyone in any of that player's teams
    or public.is_team_member(team_id)
  );

-- Trigger to update updated_at
drop trigger if exists player_availability_touch_updated_at on public.player_availability;
create trigger player_availability_touch_updated_at
  before update on public.player_availability
  for each row execute function public.touch_updated_at();
