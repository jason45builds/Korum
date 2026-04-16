create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  captain_id uuid not null references public.users (id) on delete restrict,
  title text not null,
  sport text not null,
  venue_name text not null,
  venue_address text not null,
  starts_at timestamptz not null,
  payment_due_at timestamptz,
  lock_at timestamptz,
  squad_size integer not null check (squad_size between 2 and 50),
  price_per_player numeric(10, 2) not null default 0 check (price_per_player >= 0),
  status public.match_state not null default 'DRAFT',
  visibility public.match_visibility not null default 'TEAM',
  join_code text not null unique default public.generate_short_code(),
  notes text,
  locked_at timestamptz,
  ready_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists matches_team_idx on public.matches (team_id, starts_at);
create index if not exists matches_status_idx on public.matches (status);
create index if not exists matches_captain_idx on public.matches (captain_id);
create index if not exists matches_join_code_idx on public.matches (join_code);

drop trigger if exists matches_touch_updated_at on public.matches;
create trigger matches_touch_updated_at
before update on public.matches
for each row
execute function public.touch_updated_at();

create or replace function public.can_transition_match_state(
  p_from public.match_state,
  p_to public.match_state
)
returns boolean
language sql
immutable
as $$
  select case
    when p_from = 'DRAFT' and p_to = 'RSVP_OPEN' then true
    when p_from = 'RSVP_OPEN' and p_to = 'PAYMENT_PENDING' then true
    when p_from = 'PAYMENT_PENDING' and p_to = 'LOCKED' then true
    when p_from = 'LOCKED' and p_to = 'READY' then true
    else false
  end;
$$;

create or replace function public.is_match_actor(p_match_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.matches m
    where m.id = p_match_id
      and (
        m.captain_id = p_user_id
        or public.is_team_member(m.team_id, p_user_id)
      )
  );
$$;

create or replace function public.transition_match_state(
  p_match_id uuid,
  p_next_state public.match_state,
  p_actor uuid default auth.uid()
)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  current_match public.matches;
begin
  select *
  into current_match
  from public.matches
  where id = p_match_id
  for update;

  if current_match.id is null then
    raise exception 'Match not found';
  end if;

  if p_actor is not null and current_match.captain_id <> p_actor then
    raise exception 'Only the captain can transition this match';
  end if;

  if not public.can_transition_match_state(current_match.status, p_next_state) then
    raise exception 'Invalid match state transition from % to %', current_match.status, p_next_state;
  end if;

  update public.matches
  set
    status = p_next_state,
    locked_at = case when p_next_state = 'LOCKED' then timezone('utc', now()) else locked_at end,
    ready_at = case when p_next_state = 'READY' then timezone('utc', now()) else ready_at end,
    updated_at = timezone('utc', now())
  where id = p_match_id
  returning *
  into current_match;

  return current_match;
end;
$$;

alter table public.matches enable row level security;

drop policy if exists "matches_select_actor_or_public" on public.matches;
create policy "matches_select_actor_or_public"
on public.matches
for select
to authenticated
using (visibility = 'PUBLIC' or public.is_match_actor(id));

drop policy if exists "matches_insert_captain" on public.matches;
create policy "matches_insert_captain"
on public.matches
for insert
to authenticated
with check (captain_id = auth.uid() and public.is_team_captain(team_id));

drop policy if exists "matches_update_captain" on public.matches;
create policy "matches_update_captain"
on public.matches
for update
to authenticated
using (captain_id = auth.uid())
with check (captain_id = auth.uid());
