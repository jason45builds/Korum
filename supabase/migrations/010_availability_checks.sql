-- ─── Migration 010: Availability Checks & Strategy Room ────────────────────

-- ── Availability check (captain sends to team) ──────────────────────────────
create table if not exists public.availability_checks (
  id          uuid        primary key default gen_random_uuid(),
  team_id     uuid        not null references public.teams (id) on delete cascade,
  captain_id  uuid        not null references public.users (id) on delete restrict,
  match_date  date        not null,
  match_time  time,
  venue_hint  text,
  note        text,
  expires_at  timestamptz not null default (timezone('utc', now()) + interval '48 hours'),
  locked_at   timestamptz,
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now())
);

create index if not exists avcheck_team_idx    on public.availability_checks (team_id, match_date);
create index if not exists avcheck_captain_idx on public.availability_checks (captain_id);

drop trigger if exists avcheck_touch_updated_at on public.availability_checks;
create trigger avcheck_touch_updated_at
  before update on public.availability_checks
  for each row execute function public.touch_updated_at();

-- ── Availability response enum (safe create) ─────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'availability_response') then
    create type public.availability_response as enum ('PENDING', 'AVAILABLE', 'UNAVAILABLE', 'MAYBE');
  end if;
end
$$;

-- ── Availability responses (player replies) ──────────────────────────────────
create table if not exists public.availability_responses (
  id           uuid                         primary key default gen_random_uuid(),
  check_id     uuid                         not null references public.availability_checks (id) on delete cascade,
  user_id      uuid                         not null references public.users (id) on delete cascade,
  response     public.availability_response not null default 'PENDING',
  note         text,
  responded_at timestamptz,
  created_at   timestamptz not null default timezone('utc', now()),
  updated_at   timestamptz not null default timezone('utc', now()),
  unique (check_id, user_id)
);

create index if not exists avresponse_check_idx on public.availability_responses (check_id, response);
create index if not exists avresponse_user_idx  on public.availability_responses (user_id);

drop trigger if exists avresponse_touch_updated_at on public.availability_responses;
create trigger avresponse_touch_updated_at
  before update on public.availability_responses
  for each row execute function public.touch_updated_at();

-- ── Strategy notes (locked squad board) ──────────────────────────────────────
create table if not exists public.strategy_notes (
  id         uuid        primary key default gen_random_uuid(),
  match_id   uuid        not null references public.matches (id) on delete cascade,
  author_id  uuid        not null references public.users (id) on delete restrict,
  content    text        not null,
  is_pinned  boolean     not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists strategy_match_idx on public.strategy_notes (match_id, is_pinned, created_at);

drop trigger if exists strategy_touch_updated_at on public.strategy_notes;
create trigger strategy_touch_updated_at
  before update on public.strategy_notes
  for each row execute function public.touch_updated_at();

-- ── Helper: create check + auto-populate responses ───────────────────────────
create or replace function public.create_availability_check(
  p_team_id    uuid,
  p_captain_id uuid,
  p_match_date date,
  p_match_time time        default null,
  p_venue_hint text        default null,
  p_note       text        default null,
  p_expires_at timestamptz default null
)
returns public.availability_checks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_check  public.availability_checks;
  v_member record;
begin
  if not public.is_team_captain(p_team_id, p_captain_id) then
    raise exception 'Only captains can send availability checks';
  end if;

  insert into public.availability_checks
    (team_id, captain_id, match_date, match_time, venue_hint, note, expires_at)
  values (
    p_team_id, p_captain_id, p_match_date, p_match_time, p_venue_hint, p_note,
    coalesce(p_expires_at, timezone('utc', now()) + interval '48 hours')
  )
  returning * into v_check;

  -- PENDING response for every active member except captain
  for v_member in
    select user_id from public.memberships
    where team_id = p_team_id and is_active = true and user_id <> p_captain_id
  loop
    insert into public.availability_responses (check_id, user_id, response)
    values (v_check.id, v_member.user_id, 'PENDING')
    on conflict (check_id, user_id) do nothing;
  end loop;

  -- Captain is automatically AVAILABLE
  insert into public.availability_responses (check_id, user_id, response, responded_at)
  values (v_check.id, p_captain_id, 'AVAILABLE', timezone('utc', now()))
  on conflict (check_id, user_id) do nothing;

  return v_check;
end;
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.availability_checks    enable row level security;
alter table public.availability_responses enable row level security;
alter table public.strategy_notes         enable row level security;

-- availability_checks
drop policy if exists "avcheck_select_team"    on public.availability_checks;
drop policy if exists "avcheck_insert_captain" on public.availability_checks;
drop policy if exists "avcheck_update_captain" on public.availability_checks;

create policy "avcheck_select_team" on public.availability_checks
  for select to authenticated using (public.is_team_member(team_id));

create policy "avcheck_insert_captain" on public.availability_checks
  for insert to authenticated
  with check (captain_id = auth.uid() and public.is_team_captain(team_id));

create policy "avcheck_update_captain" on public.availability_checks
  for update to authenticated using (captain_id = auth.uid());

-- availability_responses
drop policy if exists "avresponse_select_team"  on public.availability_responses;
drop policy if exists "avresponse_insert_self"  on public.availability_responses;
drop policy if exists "avresponse_update_self"  on public.availability_responses;

create policy "avresponse_select_team" on public.availability_responses
  for select to authenticated
  using (
    exists (
      select 1 from public.availability_checks ac
      where ac.id = check_id and public.is_team_member(ac.team_id)
    )
  );

create policy "avresponse_insert_self" on public.availability_responses
  for insert to authenticated with check (user_id = auth.uid());

create policy "avresponse_update_self" on public.availability_responses
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- strategy_notes
drop policy if exists "strategy_select_participant" on public.strategy_notes;
drop policy if exists "strategy_insert_participant" on public.strategy_notes;
drop policy if exists "strategy_update_author"      on public.strategy_notes;
drop policy if exists "strategy_delete_author"      on public.strategy_notes;

create policy "strategy_select_participant" on public.strategy_notes
  for select to authenticated using (public.is_match_actor(match_id));

create policy "strategy_insert_participant" on public.strategy_notes
  for insert to authenticated
  with check (author_id = auth.uid() and public.is_match_actor(match_id));

create policy "strategy_update_author" on public.strategy_notes
  for update to authenticated using (author_id = auth.uid());

create policy "strategy_delete_author" on public.strategy_notes
  for delete to authenticated using (author_id = auth.uid());
