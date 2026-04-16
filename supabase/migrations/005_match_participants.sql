create table if not exists public.match_participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  invite_id uuid,
  status public.participant_status not null default 'RSVP',
  payment_status public.payment_status not null default 'CREATED',
  hold_expires_at timestamptz,
  joined_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (match_id, user_id)
);

create index if not exists match_participants_match_idx
  on public.match_participants (match_id, status);
create index if not exists match_participants_user_idx
  on public.match_participants (user_id, status);
create index if not exists match_participants_hold_idx
  on public.match_participants (hold_expires_at)
  where status = 'PAYMENT_PENDING';

drop trigger if exists match_participants_touch_updated_at on public.match_participants;
create trigger match_participants_touch_updated_at
before update on public.match_participants
for each row
execute function public.touch_updated_at();

create or replace function public.ensure_match_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_match public.matches;
  reserved_count integer;
begin
  if new.status not in ('PAYMENT_PENDING', 'CONFIRMED', 'LOCKED') then
    return new;
  end if;

  select *
  into current_match
  from public.matches
  where id = new.match_id
  for update;

  if current_match.id is null then
    raise exception 'Match not found for participant capacity check';
  end if;

  select count(*)
  into reserved_count
  from public.match_participants mp
  where mp.match_id = new.match_id
    and mp.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
    and mp.status in ('PAYMENT_PENDING', 'CONFIRMED', 'LOCKED')
    and (
      mp.status <> 'PAYMENT_PENDING'
      or mp.hold_expires_at is null
      or mp.hold_expires_at > timezone('utc', now())
    );

  if reserved_count + 1 > current_match.squad_size then
    raise exception 'Squad is full for match %', new.match_id;
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_match_capacity_trigger on public.match_participants;
create trigger ensure_match_capacity_trigger
before insert or update on public.match_participants
for each row
execute function public.ensure_match_capacity();

create or replace function public.release_expired_participant_holds(p_match_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_rows integer;
begin
  update public.match_participants
  set
    status = 'RSVP',
    payment_status = 'FAILED',
    hold_expires_at = null,
    updated_at = timezone('utc', now())
  where status = 'PAYMENT_PENDING'
    and hold_expires_at is not null
    and hold_expires_at <= timezone('utc', now())
    and (p_match_id is null or match_id = p_match_id);

  get diagnostics affected_rows = row_count;
  return affected_rows;
end;
$$;

create or replace function public.reserve_match_slot(
  p_match_id uuid,
  p_user_id uuid,
  p_expires_at timestamptz,
  p_invite_id uuid default null
)
returns public.match_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  current_match public.matches;
  current_participant public.match_participants;
begin
  perform public.release_expired_participant_holds(p_match_id);

  select *
  into current_match
  from public.matches
  where id = p_match_id
  for update;

  if current_match.id is null then
    raise exception 'Match not found';
  end if;

  if current_match.status not in ('RSVP_OPEN', 'PAYMENT_PENDING') then
    raise exception 'Match is not accepting payments';
  end if;

  insert into public.match_participants (
    match_id,
    user_id,
    invite_id,
    status,
    payment_status,
    hold_expires_at
  )
  values (
    p_match_id,
    p_user_id,
    p_invite_id,
    'PAYMENT_PENDING',
    'PENDING',
    p_expires_at
  )
  on conflict (match_id, user_id)
  do update
  set
    invite_id = coalesce(excluded.invite_id, public.match_participants.invite_id),
    status = case
      when public.match_participants.status in ('CONFIRMED', 'LOCKED') then public.match_participants.status
      else 'PAYMENT_PENDING'
    end,
    payment_status = case
      when public.match_participants.status in ('CONFIRMED', 'LOCKED') then public.match_participants.payment_status
      else 'PENDING'
    end,
    hold_expires_at = case
      when public.match_participants.status in ('CONFIRMED', 'LOCKED') then public.match_participants.hold_expires_at
      else excluded.hold_expires_at
    end,
    updated_at = timezone('utc', now())
  returning *
  into current_participant;

  if current_match.status = 'RSVP_OPEN' then
    update public.matches
    set status = 'PAYMENT_PENDING'
    where id = p_match_id;
  end if;

  return current_participant;
end;
$$;

alter table public.match_participants enable row level security;

drop policy if exists "match_participants_select_match_actor" on public.match_participants;
create policy "match_participants_select_match_actor"
on public.match_participants
for select
to authenticated
using (public.is_match_actor(match_id) or user_id = auth.uid());

drop policy if exists "match_participants_insert_self_or_captain" on public.match_participants;
create policy "match_participants_insert_self_or_captain"
on public.match_participants
for insert
to authenticated
with check (user_id = auth.uid() or public.is_match_actor(match_id));

drop policy if exists "match_participants_update_self_or_captain" on public.match_participants;
create policy "match_participants_update_self_or_captain"
on public.match_participants
for update
to authenticated
using (user_id = auth.uid() or public.is_match_actor(match_id))
with check (user_id = auth.uid() or public.is_match_actor(match_id));
