create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role public.membership_role not null default 'PLAYER',
  joined_at timestamptz not null default timezone('utc', now()),
  is_active boolean not null default true,
  updated_at timestamptz not null default timezone('utc', now()),
  unique (team_id, user_id)
);

create index if not exists memberships_team_idx on public.memberships (team_id, role);
create index if not exists memberships_user_idx on public.memberships (user_id);
create unique index if not exists memberships_single_captain_idx
  on public.memberships (team_id)
  where role = 'CAPTAIN' and is_active = true;

drop trigger if exists memberships_touch_updated_at on public.memberships;
create trigger memberships_touch_updated_at
before update on public.memberships
for each row
execute function public.touch_updated_at();

create or replace function public.is_team_member(p_team_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships
    where team_id = p_team_id
      and user_id = p_user_id
      and is_active = true
  );
$$;

create or replace function public.is_team_captain(p_team_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships
    where team_id = p_team_id
      and user_id = p_user_id
      and role = 'CAPTAIN'
      and is_active = true
  );
$$;

alter table public.memberships enable row level security;

drop policy if exists "memberships_select_team_member" on public.memberships;
create policy "memberships_select_team_member"
on public.memberships
for select
to authenticated
using (public.is_team_member(team_id));

drop policy if exists "memberships_insert_self_or_captain" on public.memberships;
create policy "memberships_insert_self_or_captain"
on public.memberships
for insert
to authenticated
with check (user_id = auth.uid() or public.is_team_captain(team_id));

drop policy if exists "memberships_update_captain" on public.memberships;
create policy "memberships_update_captain"
on public.memberships
for update
to authenticated
using (public.is_team_captain(team_id))
with check (public.is_team_captain(team_id));
