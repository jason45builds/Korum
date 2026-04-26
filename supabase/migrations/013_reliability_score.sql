-- ─── Migration 013: Reliability Score Engine ──────────────────────────────
-- Run order: helpers first → table → policies → functions → trigger

-- ── STEP 1: is_match_captain helper (must exist before policies) ─────────────
create or replace function public.is_match_captain(p_match_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.matches
    where id = p_match_id and captain_id = auth.uid()
  );
$$;

-- ── STEP 2: match_attendance table ───────────────────────────────────────────
create table if not exists public.match_attendance (
  id           uuid        primary key default gen_random_uuid(),
  match_id     uuid        not null references public.matches (id) on delete cascade,
  user_id      uuid        not null references public.users (id) on delete cascade,
  status       text        not null check (status in ('ATTENDED', 'NO_SHOW', 'LATE_CANCEL')),
  recorded_by  uuid        references public.users (id),
  recorded_at  timestamptz not null default timezone('utc', now()),
  unique (match_id, user_id)
);

create index if not exists attendance_user_idx  on public.match_attendance (user_id);
create index if not exists attendance_match_idx on public.match_attendance (match_id);

-- ── STEP 3: RLS (now safe — is_match_captain exists) ─────────────────────────
alter table public.match_attendance enable row level security;

drop policy if exists "attendance_select_team"   on public.match_attendance;
drop policy if exists "attendance_insert_captain" on public.match_attendance;
drop policy if exists "attendance_update_captain" on public.match_attendance;

create policy "attendance_select_team" on public.match_attendance
  for select to authenticated
  using (public.is_match_actor(match_id));

create policy "attendance_insert_captain" on public.match_attendance
  for insert to authenticated
  with check (recorded_by = auth.uid() and public.is_match_captain(match_id));

create policy "attendance_update_captain" on public.match_attendance
  for update to authenticated
  using (public.is_match_captain(match_id));

-- ── STEP 4: Reliability score computation ────────────────────────────────────
create or replace function public.recompute_reliability(p_user_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_score       numeric := 100;
  v_attended    int     := 0;
  v_no_show     int     := 0;
  v_late_cancel int     := 0;
begin
  select
    count(*) filter (where status = 'ATTENDED'),
    count(*) filter (where status = 'NO_SHOW'),
    count(*) filter (where status = 'LATE_CANCEL')
  into v_attended, v_no_show, v_late_cancel
  from public.match_attendance
  where user_id = p_user_id;

  v_score := v_score - (v_no_show    * 15);
  v_score := v_score - (v_late_cancel * 8);
  v_score := v_score + (v_attended   *  2);
  v_score := greatest(0, least(100, v_score));

  update public.users
  set reliability_score = v_score,
      updated_at        = timezone('utc', now())
  where id = p_user_id;

  return v_score;
end;
$$;

-- ── STEP 5: Trigger function ──────────────────────────────────────────────────
create or replace function public.trigger_recompute_reliability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_reliability(new.user_id);
  return new;
end;
$$;

drop trigger if exists on_attendance_change on public.match_attendance;
create trigger on_attendance_change
  after insert or update on public.match_attendance
  for each row
  execute function public.trigger_recompute_reliability();

-- ── STEP 6: finalize_match_attendance convenience function ───────────────────
create or replace function public.finalize_match_attendance(
  p_match_id   uuid,
  p_captain_id uuid,
  p_attendees  uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant record;
begin
  if not public.is_match_captain(p_match_id) then
    raise exception 'Only captain can record attendance';
  end if;

  for v_participant in
    select user_id from public.participants
    where match_id = p_match_id
      and status in ('CONFIRMED', 'LOCKED')
  loop
    insert into public.match_attendance (match_id, user_id, status, recorded_by)
    values (
      p_match_id,
      v_participant.user_id,
      case when v_participant.user_id = any(p_attendees) then 'ATTENDED' else 'NO_SHOW' end,
      p_captain_id
    )
    on conflict (match_id, user_id) do update
      set status      = excluded.status,
          recorded_at = timezone('utc', now());
  end loop;

  update public.matches set status = 'READY' where id = p_match_id;
end;
$$;
