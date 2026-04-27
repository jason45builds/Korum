-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 020: Tournaments
-- Full tournament engine — creation, team registration, fixtures, results,
-- standings, leaderboard, and organizer controls.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Enums ─────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tournament_status') then
    create type public.tournament_status as enum (
      'DRAFT',
      'REGISTRATION_OPEN',
      'REGISTRATION_CLOSED',
      'ONGOING',
      'COMPLETED',
      'CANCELLED'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'tournament_format') then
    create type public.tournament_format as enum (
      'LEAGUE',
      'KNOCKOUT',
      'GROUP_KNOCKOUT',
      'ROUND_ROBIN',
      'CUSTOM'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'fixture_status') then
    create type public.fixture_status as enum (
      'SCHEDULED',
      'LIVE',
      'COMPLETED',
      'WALKOVER',
      'ABANDONED',
      'POSTPONED'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'registration_status') then
    create type public.registration_status as enum (
      'PENDING',
      'APPROVED',
      'REJECTED',
      'WITHDRAWN'
    );
  end if;
end $$;

-- ── Core tournament table ─────────────────────────────────────────────────
create table if not exists public.tournaments (
  id                  uuid                      primary key default gen_random_uuid(),
  organizer_id        uuid                      references public.users(id) on delete set null,
  name                text                      not null,
  description         text,
  sport               text                      not null,
  format              public.tournament_format  not null default 'LEAGUE',
  status              public.tournament_status  not null default 'DRAFT',
  city                text                      not null,
  venue_name          text,
  venue_address       text,
  starts_on           date                      not null,
  ends_on             date,
  registration_closes date,
  max_teams           int                       not null default 8,
  min_teams           int                       not null default 4,
  entry_fee           numeric(10,2)             not null default 0,
  prize_pool          numeric(10,2)             not null default 0,
  prize_breakdown     jsonb,                          -- {"1st":"60%","2nd":"30%","3rd":"10%"}
  rules               text,
  banner_url          text,
  logo_url            text,
  is_public           boolean                   not null default true,
  join_code           text                      unique default public.generate_short_code(),
  points_per_win      int                       not null default 3,
  points_per_draw     int                       not null default 1,
  points_per_loss     int                       not null default 0,
  created_at          timestamptz               not null default timezone('utc', now()),
  updated_at          timestamptz               not null default timezone('utc', now()),

  constraint tournaments_date_check check (ends_on is null or ends_on >= starts_on),
  constraint tournaments_teams_check check (max_teams >= min_teams and min_teams >= 2)
);

create index if not exists tournaments_sport_city_idx on public.tournaments(sport, city);
create index if not exists tournaments_status_idx     on public.tournaments(status);
create index if not exists tournaments_organizer_idx  on public.tournaments(organizer_id);

drop trigger if exists tournaments_touch_updated_at on public.tournaments;
create trigger tournaments_touch_updated_at
  before update on public.tournaments
  for each row execute function public.touch_updated_at();

-- ── Tournament team registrations ────────────────────────────────────────
create table if not exists public.tournament_registrations (
  id              uuid                       primary key default gen_random_uuid(),
  tournament_id   uuid                       not null references public.tournaments(id) on delete cascade,
  team_id         uuid                       not null references public.teams(id) on delete cascade,
  registered_by   uuid                       not null references public.users(id),
  status          public.registration_status not null default 'PENDING',
  group_name      text,                            -- e.g. "Group A", "Group B"
  seed            int,                             -- seeding position
  entry_fee_paid  boolean                    not null default false,
  payment_ref     text,
  notes           text,
  registered_at   timestamptz                not null default timezone('utc', now()),
  updated_at      timestamptz                not null default timezone('utc', now()),
  unique (tournament_id, team_id)
);

create index if not exists treg_tournament_idx on public.tournament_registrations(tournament_id, status);
create index if not exists treg_team_idx       on public.tournament_registrations(team_id);

drop trigger if exists treg_touch_updated_at on public.tournament_registrations;
create trigger treg_touch_updated_at
  before update on public.tournament_registrations
  for each row execute function public.touch_updated_at();

-- ── Tournament fixtures (individual matches within tournament) ────────────
create table if not exists public.tournament_fixtures (
  id              uuid                   primary key default gen_random_uuid(),
  tournament_id   uuid                   not null references public.tournaments(id) on delete cascade,
  match_id        uuid                   references public.matches(id) on delete set null,
  home_team_id    uuid                   references public.teams(id) on delete set null,
  away_team_id    uuid                   references public.teams(id) on delete set null,
  round           int                    not null default 1,       -- 1 = first round
  round_name      text,                                             -- "Quarter-final", "Group A - MD1"
  group_name      text,
  fixture_date    timestamptz,
  venue_name      text,
  status          public.fixture_status  not null default 'SCHEDULED',

  -- Results
  home_score      int,
  away_score      int,
  home_wickets    int,                   -- cricket
  away_wickets    int,
  home_overs      numeric(5,1),
  away_overs      numeric(5,1),
  winner_team_id  uuid                   references public.teams(id) on delete set null,
  is_draw         boolean                not null default false,
  result_summary  text,                  -- "Desert Wings won by 24 runs"
  awarded_by      uuid                   references public.users(id),

  -- Points awarded
  home_points     int                    not null default 0,
  away_points     int                    not null default 0,

  created_at      timestamptz            not null default timezone('utc', now()),
  updated_at      timestamptz            not null default timezone('utc', now())
);

create index if not exists fixtures_tournament_idx on public.tournament_fixtures(tournament_id, round);
create index if not exists fixtures_team_idx       on public.tournament_fixtures(home_team_id, away_team_id);
create index if not exists fixtures_status_idx     on public.tournament_fixtures(status);

drop trigger if exists fixtures_touch_updated_at on public.tournament_fixtures;
create trigger fixtures_touch_updated_at
  before update on public.tournament_fixtures
  for each row execute function public.touch_updated_at();

-- ── Tournament standings (materialized per team) ──────────────────────────
create table if not exists public.tournament_standings (
  id              uuid        primary key default gen_random_uuid(),
  tournament_id   uuid        not null references public.tournaments(id) on delete cascade,
  team_id         uuid        not null references public.teams(id) on delete cascade,
  group_name      text,
  played          int         not null default 0,
  won             int         not null default 0,
  drawn           int         not null default 0,
  lost            int         not null default 0,
  points          int         not null default 0,
  -- Sport-specific columns (generic enough for cricket/football/etc.)
  runs_scored     int         not null default 0,   -- cricket: total runs / football: goals for
  runs_conceded   int         not null default 0,   -- cricket: runs against / football: goals against
  nrr             numeric(6,3) not null default 0,  -- cricket NRR / football goal difference
  position        int,
  qualified       boolean,                           -- qualified to next stage
  eliminated      boolean     not null default false,
  updated_at      timestamptz not null default timezone('utc', now()),
  unique (tournament_id, team_id)
);

create index if not exists standings_tournament_idx on public.tournament_standings(tournament_id, points desc, nrr desc);

-- ── Tournament announcements / updates ────────────────────────────────────
create table if not exists public.tournament_announcements (
  id            uuid        primary key default gen_random_uuid(),
  tournament_id uuid        not null references public.tournaments(id) on delete cascade,
  author_id     uuid        not null references public.users(id),
  title         text        not null,
  body          text        not null,
  is_pinned     boolean     not null default false,
  created_at    timestamptz not null default timezone('utc', now())
);

create index if not exists announcements_tournament_idx on public.tournament_announcements(tournament_id, is_pinned, created_at desc);

-- ── Tournament player stats (individual performance per tournament) ────────
create table if not exists public.tournament_player_stats (
  id              uuid        primary key default gen_random_uuid(),
  tournament_id   uuid        not null references public.tournaments(id) on delete cascade,
  user_id         uuid        not null references public.users(id) on delete cascade,
  team_id         uuid        not null references public.teams(id) on delete cascade,
  -- Cricket batting
  innings         int         not null default 0,
  runs            int         not null default 0,
  balls_faced     int         not null default 0,
  fours           int         not null default 0,
  sixes           int         not null default 0,
  highest_score   int         not null default 0,
  fifties         int         not null default 0,
  hundreds        int         not null default 0,
  -- Cricket bowling
  overs_bowled    numeric(5,1) not null default 0,
  wickets         int         not null default 0,
  runs_conceded   int         not null default 0,
  best_bowling    text,                              -- "3/24"
  -- General
  matches_played  int         not null default 0,
  motm_awards     int         not null default 0,
  updated_at      timestamptz not null default timezone('utc', now()),
  unique (tournament_id, user_id)
);

create index if not exists tstats_tournament_idx on public.tournament_player_stats(tournament_id);
create index if not exists tstats_user_idx       on public.tournament_player_stats(user_id);

-- ── Helper function: recalculate standings from fixtures ──────────────────
create or replace function public.recalculate_tournament_standings(p_tournament_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament public.tournaments;
  v_fixture    record;
begin
  select * into v_tournament from public.tournaments where id = p_tournament_id;
  if v_tournament.id is null then
    raise exception 'Tournament not found';
  end if;

  -- Reset standings for all registered teams
  update public.tournament_standings
  set played=0, won=0, drawn=0, lost=0, points=0,
      runs_scored=0, runs_conceded=0, nrr=0, updated_at=timezone('utc', now())
  where tournament_id = p_tournament_id;

  -- Insert missing teams
  insert into public.tournament_standings (tournament_id, team_id, group_name)
  select p_tournament_id, tr.team_id, tr.group_name
  from public.tournament_registrations tr
  where tr.tournament_id = p_tournament_id
    and tr.status = 'APPROVED'
  on conflict (tournament_id, team_id) do nothing;

  -- Aggregate completed fixtures
  for v_fixture in
    select * from public.tournament_fixtures
    where tournament_id = p_tournament_id
      and status = 'COMPLETED'
  loop
    -- Home team
    if v_fixture.home_team_id is not null then
      update public.tournament_standings
      set
        played        = played + 1,
        won           = won   + case when v_fixture.winner_team_id = v_fixture.home_team_id then 1 else 0 end,
        drawn         = drawn + case when v_fixture.is_draw then 1 else 0 end,
        lost          = lost  + case when v_fixture.winner_team_id is not null and v_fixture.winner_team_id <> v_fixture.home_team_id and not v_fixture.is_draw then 1 else 0 end,
        points        = points + v_fixture.home_points,
        runs_scored   = runs_scored   + coalesce(v_fixture.home_score, 0),
        runs_conceded = runs_conceded + coalesce(v_fixture.away_score, 0),
        updated_at    = timezone('utc', now())
      where tournament_id = p_tournament_id and team_id = v_fixture.home_team_id;
    end if;

    -- Away team
    if v_fixture.away_team_id is not null then
      update public.tournament_standings
      set
        played        = played + 1,
        won           = won   + case when v_fixture.winner_team_id = v_fixture.away_team_id then 1 else 0 end,
        drawn         = drawn + case when v_fixture.is_draw then 1 else 0 end,
        lost          = lost  + case when v_fixture.winner_team_id is not null and v_fixture.winner_team_id <> v_fixture.away_team_id and not v_fixture.is_draw then 1 else 0 end,
        points        = points + v_fixture.away_points,
        runs_scored   = runs_scored   + coalesce(v_fixture.away_score, 0),
        runs_conceded = runs_conceded + coalesce(v_fixture.home_score, 0),
        updated_at    = timezone('utc', now())
      where tournament_id = p_tournament_id and team_id = v_fixture.away_team_id;
    end if;
  end loop;

  -- Assign positions ordered by points desc, then nrr desc
  with ranked as (
    select team_id,
           row_number() over (
             partition by tournament_id
             order by points desc, nrr desc, (runs_scored - runs_conceded) desc
           ) as pos
    from public.tournament_standings
    where tournament_id = p_tournament_id
  )
  update public.tournament_standings ts
  set position = r.pos
  from ranked r
  where ts.tournament_id = p_tournament_id
    and ts.team_id = r.team_id;
end;
$$;

-- ── Trigger: auto-recalculate standings when fixture result is saved ───────
create or replace function public.trigger_recalculate_standings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'COMPLETED' then
    perform public.recalculate_tournament_standings(new.tournament_id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_fixture_result on public.tournament_fixtures;
create trigger on_fixture_result
  after insert or update on public.tournament_fixtures
  for each row execute function public.trigger_recalculate_standings();

-- ── Helper: register a team (captain calls this) ──────────────────────────
create or replace function public.register_team_for_tournament(
  p_tournament_id uuid,
  p_team_id       uuid,
  p_user_id       uuid default auth.uid()
)
returns public.tournament_registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament public.tournaments;
  v_reg        public.tournament_registrations;
  v_count      int;
begin
  select * into v_tournament from public.tournaments where id = p_tournament_id for share;

  if v_tournament.id is null then
    raise exception 'Tournament not found';
  end if;

  if v_tournament.status <> 'REGISTRATION_OPEN' then
    raise exception 'Tournament registration is not open';
  end if;

  if v_tournament.registration_closes is not null
     and v_tournament.registration_closes < current_date then
    raise exception 'Tournament registration has closed';
  end if;

  -- Check capacity
  select count(*) into v_count
  from public.tournament_registrations
  where tournament_id = p_tournament_id
    and status in ('PENDING', 'APPROVED');

  if v_count >= v_tournament.max_teams then
    raise exception 'Tournament is full (% teams max)', v_tournament.max_teams;
  end if;

  insert into public.tournament_registrations (tournament_id, team_id, registered_by)
  values (p_tournament_id, p_team_id, p_user_id)
  on conflict (tournament_id, team_id)
  do update set status = 'PENDING', updated_at = timezone('utc', now())
  returning * into v_reg;

  return v_reg;
end;
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────
alter table public.tournaments                enable row level security;
alter table public.tournament_registrations   enable row level security;
alter table public.tournament_fixtures        enable row level security;
alter table public.tournament_standings       enable row level security;
alter table public.tournament_announcements   enable row level security;
alter table public.tournament_player_stats    enable row level security;

-- Tournaments: public ones visible to all auth'd users; organizer can write
drop policy if exists "tournaments_select_public"     on public.tournaments;
drop policy if exists "tournaments_insert_organizer"  on public.tournaments;
drop policy if exists "tournaments_update_organizer"  on public.tournaments;
create policy "tournaments_select_public"    on public.tournaments for select to authenticated
  using (is_public = true or organizer_id = auth.uid());
create policy "tournaments_insert_organizer" on public.tournaments for insert to authenticated
  with check (organizer_id = auth.uid());
create policy "tournaments_update_organizer" on public.tournaments for update to authenticated
  using (organizer_id = auth.uid()) with check (organizer_id = auth.uid());

-- Registrations: team members see their own; organizer sees all
drop policy if exists "treg_select"  on public.tournament_registrations;
drop policy if exists "treg_insert"  on public.tournament_registrations;
drop policy if exists "treg_update"  on public.tournament_registrations;
create policy "treg_select" on public.tournament_registrations for select to authenticated
  using (
    public.is_team_member(team_id)
    or exists (select 1 from public.tournaments t where t.id = tournament_id and t.organizer_id = auth.uid())
  );
create policy "treg_insert" on public.tournament_registrations for insert to authenticated
  with check (registered_by = auth.uid() and public.is_team_captain(team_id));
create policy "treg_update" on public.tournament_registrations for update to authenticated
  using (
    exists (select 1 from public.tournaments t where t.id = tournament_id and t.organizer_id = auth.uid())
  );

-- Fixtures: all registered teams can view; organizer can write
drop policy if exists "fixtures_select"  on public.tournament_fixtures;
drop policy if exists "fixtures_write"   on public.tournament_fixtures;
create policy "fixtures_select" on public.tournament_fixtures for select to authenticated
  using (
    exists (
      select 1 from public.tournaments t where t.id = tournament_id
      and (t.is_public = true or t.organizer_id = auth.uid())
    )
  );
create policy "fixtures_write" on public.tournament_fixtures for all to authenticated
  using (
    exists (select 1 from public.tournaments t where t.id = tournament_id and t.organizer_id = auth.uid())
  );

-- Standings: same visibility as tournament
drop policy if exists "standings_select" on public.tournament_standings;
create policy "standings_select" on public.tournament_standings for select to authenticated
  using (
    exists (
      select 1 from public.tournaments t where t.id = tournament_id
      and (t.is_public = true or t.organizer_id = auth.uid())
    )
  );

-- Announcements: visible to all; organizer writes
drop policy if exists "announcements_select" on public.tournament_announcements;
drop policy if exists "announcements_write"  on public.tournament_announcements;
create policy "announcements_select" on public.tournament_announcements for select to authenticated
  using (exists (select 1 from public.tournaments t where t.id = tournament_id and t.is_public = true));
create policy "announcements_write"  on public.tournament_announcements for all to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

-- Player stats: public read
drop policy if exists "tstats_select" on public.tournament_player_stats;
drop policy if exists "tstats_write"  on public.tournament_player_stats;
create policy "tstats_select" on public.tournament_player_stats for select to authenticated using (true);
create policy "tstats_write"  on public.tournament_player_stats for all to authenticated
  using (
    exists (select 1 from public.tournaments t where t.id = tournament_id and t.organizer_id = auth.uid())
  );

-- ── Realtime ─────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_rel pr
      join pg_publication p on p.oid = pr.prpubid
      join pg_class c on c.oid = pr.prrelid
      join pg_namespace n on n.oid = c.relnamespace
      where p.pubname = 'supabase_realtime'
        and n.nspname = 'public' and c.relname = 'tournament_fixtures'
    ) then
      execute 'alter publication supabase_realtime add table public.tournament_fixtures';
    end if;
    if not exists (
      select 1 from pg_publication_rel pr
      join pg_publication p on p.oid = pr.prpubid
      join pg_class c on c.oid = pr.prrelid
      join pg_namespace n on n.oid = c.relnamespace
      where p.pubname = 'supabase_realtime'
        and n.nspname = 'public' and c.relname = 'tournament_standings'
    ) then
      execute 'alter publication supabase_realtime add table public.tournament_standings';
    end if;
  end if;
end $$;
