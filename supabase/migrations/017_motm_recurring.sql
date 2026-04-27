-- Migration 017: Player of the Match (MOTM) voting + Recurring matches

-- ── MOTM votes ────────────────────────────────────────────────────────────────
create table if not exists public.motm_votes (
  id          uuid        primary key default gen_random_uuid(),
  match_id    uuid        not null references public.matches(id) on delete cascade,
  voter_id    uuid        not null references public.users(id) on delete cascade,
  nominee_id  uuid        not null references public.users(id) on delete cascade,
  voted_at    timestamptz not null default timezone('utc', now()),
  unique(match_id, voter_id)   -- one vote per player per match
);
create index if not exists motm_match_idx on public.motm_votes(match_id);
alter table public.motm_votes enable row level security;
drop policy if exists "motm_select_participants" on public.motm_votes;
drop policy if exists "motm_insert_participants" on public.motm_votes;
create policy "motm_select_participants" on public.motm_votes
  for select to authenticated using (public.is_match_actor(match_id));
create policy "motm_insert_participants" on public.motm_votes
  for all to authenticated
  using (voter_id = auth.uid())
  with check (voter_id = auth.uid());

-- ── Recurring match templates ─────────────────────────────────────────────────
create table if not exists public.recurring_matches (
  id              uuid        primary key default gen_random_uuid(),
  team_id         uuid        not null references public.teams(id) on delete cascade,
  captain_id      uuid        not null references public.users(id),
  title           text        not null,
  sport           text,
  venue_name      text,
  venue_address   text,
  squad_size      int         not null default 11,
  price_per_player numeric(10,2) not null default 0,
  frequency       text        not null check (frequency in ('WEEKLY','BIWEEKLY','MONTHLY')),
  day_of_week     int         check (day_of_week between 0 and 6), -- 0=Sun
  time_of_day     time        not null default '07:00',
  is_active       boolean     not null default true,
  next_match_at   timestamptz,
  created_at      timestamptz not null default timezone('utc', now())
);
alter table public.recurring_matches enable row level security;
drop policy if exists "recurring_captain" on public.recurring_matches;
create policy "recurring_captain" on public.recurring_matches
  for all to authenticated
  using (captain_id = auth.uid())
  with check (captain_id = auth.uid());
