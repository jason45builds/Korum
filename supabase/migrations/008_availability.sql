create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  slot_label text not null,
  slot_starts_at timestamptz not null,
  slot_ends_at timestamptz not null,
  is_available boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (match_id, user_id, slot_starts_at, slot_ends_at)
);

alter table public.availability
  add constraint availability_slot_window_check
  check (slot_ends_at > slot_starts_at);

create index if not exists availability_match_idx on public.availability (match_id, user_id);
create index if not exists availability_window_idx on public.availability (slot_starts_at, slot_ends_at);

drop trigger if exists availability_touch_updated_at on public.availability;
create trigger availability_touch_updated_at
before update on public.availability
for each row
execute function public.touch_updated_at();

create or replace function public.upsert_match_availability(
  p_match_id uuid,
  p_user_id uuid,
  p_slot_label text,
  p_slot_starts_at timestamptz,
  p_slot_ends_at timestamptz,
  p_is_available boolean
)
returns public.availability
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.availability;
begin
  insert into public.availability (
    match_id,
    user_id,
    slot_label,
    slot_starts_at,
    slot_ends_at,
    is_available
  )
  values (
    p_match_id,
    p_user_id,
    p_slot_label,
    p_slot_starts_at,
    p_slot_ends_at,
    p_is_available
  )
  on conflict (match_id, user_id, slot_starts_at, slot_ends_at)
  do update
  set
    slot_label = excluded.slot_label,
    is_available = excluded.is_available,
    updated_at = timezone('utc', now())
  returning *
  into current_row;

  return current_row;
end;
$$;

alter table public.availability enable row level security;

drop policy if exists "availability_select_actor" on public.availability;
create policy "availability_select_actor"
on public.availability
for select
to authenticated
using (public.is_match_actor(match_id) or user_id = auth.uid());

drop policy if exists "availability_insert_self" on public.availability;
create policy "availability_insert_self"
on public.availability
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "availability_update_self" on public.availability;
create policy "availability_update_self"
on public.availability
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
