begin;

create extension if not exists pgcrypto;

drop trigger if exists on_auth_user_synced on auth.users;

drop table if exists public.reliability cascade;
drop table if exists public.availability cascade;
drop table if exists public.payments cascade;
drop table if exists public.match_invites cascade;
drop table if exists public.match_participants cascade;
drop table if exists public.matches cascade;
drop table if exists public.memberships cascade;
drop table if exists public.teams cascade;
drop table if exists public.users cascade;

drop type if exists public.payment_status cascade;
drop type if exists public.invite_status cascade;
drop type if exists public.participant_status cascade;
drop type if exists public.match_visibility cascade;
drop type if exists public.match_state cascade;
drop type if exists public.membership_role cascade;

create type public.membership_role as enum ('CAPTAIN', 'PLAYER');
create type public.match_state as enum ('DRAFT', 'RSVP_OPEN', 'PAYMENT_PENDING', 'LOCKED', 'READY');
create type public.match_visibility as enum ('PRIVATE', 'TEAM', 'PUBLIC');
create type public.participant_status as enum (
  'INVITED',
  'RSVP',
  'PAYMENT_PENDING',
  'CONFIRMED',
  'LOCKED',
  'DECLINED',
  'EXPIRED',
  'WAITLISTED'
);
create type public.invite_status as enum ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');
create type public.payment_status as enum (
  'CREATED',
  'PENDING',
  'PAID',
  'FAILED',
  'REFUND_PENDING',
  'REFUNDED'
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.generate_short_code()
returns text
language sql
as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
$$;

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text unique,
  full_name text not null,
  display_name text not null,
  avatar_url text,
  default_sport text,
  city text,
  role text not null default 'player' check (role in ('captain', 'player')),
  reliability_score numeric(5, 2) not null default 100.00 check (reliability_score between 0 and 100),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index users_role_idx on public.users (role);

create trigger users_touch_updated_at
before update on public.users
for each row
execute function public.touch_updated_at();

create or replace function public.sync_auth_user_to_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_phone text;
  normalized_email text;
  fallback_handle text;
  derived_name text;
  derived_display_name text;
begin
  normalized_phone := nullif(trim(coalesce(new.phone, new.raw_user_meta_data ->> 'phone', '')), '');
  normalized_email := nullif(trim(new.email), '');
  fallback_handle := coalesce(
    normalized_phone,
    normalized_email,
    'user-' || left(new.id::text, 8)
  );

  derived_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    case when normalized_email is not null then split_part(normalized_email, '@', 1) end,
    fallback_handle
  );

  derived_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    derived_name
  );

  insert into public.users (
    id,
    phone,
    full_name,
    display_name,
    avatar_url,
    default_sport,
    city
  )
  values (
    new.id,
    normalized_phone,
    derived_name,
    derived_display_name,
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'default_sport',
    new.raw_user_meta_data ->> 'city'
  )
  on conflict (id) do update
  set
    phone = coalesce(excluded.phone, public.users.phone),
    full_name = excluded.full_name,
    display_name = excluded.display_name,
    avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url),
    default_sport = coalesce(excluded.default_sport, public.users.default_sport),
    city = coalesce(excluded.city, public.users.city),
    updated_at = timezone('utc', now());

  return new;
end;
$$;

create trigger on_auth_user_synced
after insert or update on auth.users
for each row
execute function public.sync_auth_user_to_profile();

alter table public.users enable row level security;

create policy "users_select_self"
on public.users
for select
to authenticated
using (id = auth.uid());

create policy "users_update_self"
on public.users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sport text not null,
  city text not null,
  captain_id uuid not null references public.users (id) on delete restrict,
  invite_code text not null unique default public.generate_short_code(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index teams_captain_idx on public.teams (captain_id);
create index teams_sport_city_idx on public.teams (sport, city);

create trigger teams_touch_updated_at
before update on public.teams
for each row
execute function public.touch_updated_at();

alter table public.teams enable row level security;

create policy "teams_select_authenticated"
on public.teams
for select
to authenticated
using (true);

create policy "teams_insert_captain"
on public.teams
for insert
to authenticated
with check (captain_id = auth.uid());

create policy "teams_update_captain"
on public.teams
for update
to authenticated
using (captain_id = auth.uid())
with check (captain_id = auth.uid());

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role public.membership_role not null default 'PLAYER',
  joined_at timestamptz not null default timezone('utc', now()),
  is_active boolean not null default true,
  updated_at timestamptz not null default timezone('utc', now()),
  unique (team_id, user_id)
);

create index memberships_team_idx on public.memberships (team_id, role);
create index memberships_user_idx on public.memberships (user_id);
create unique index memberships_single_captain_idx
  on public.memberships (team_id)
  where role = 'CAPTAIN' and is_active = true;

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

create policy "memberships_select_team_member"
on public.memberships
for select
to authenticated
using (public.is_team_member(team_id));

create policy "memberships_insert_self_or_captain"
on public.memberships
for insert
to authenticated
with check (user_id = auth.uid() or public.is_team_captain(team_id));

create policy "memberships_update_captain"
on public.memberships
for update
to authenticated
using (public.is_team_captain(team_id))
with check (public.is_team_captain(team_id));

create table public.matches (
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
  updated_at timestamptz not null default timezone('utc', now()),
  constraint matches_payment_due_before_start_check
    check (payment_due_at is null or payment_due_at < starts_at),
  constraint matches_lock_before_start_check
    check (lock_at is null or lock_at <= starts_at)
);

create index matches_team_idx on public.matches (team_id, starts_at);
create index matches_status_idx on public.matches (status);
create index matches_captain_idx on public.matches (captain_id);

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

create table public.match_participants (
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

create index match_participants_match_idx
  on public.match_participants (match_id, status);
create index match_participants_user_idx
  on public.match_participants (user_id, status);
create index match_participants_hold_idx
  on public.match_participants (hold_expires_at)
  where status = 'PAYMENT_PENDING';

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
        or exists (
          select 1
          from public.match_participants mp
          where mp.match_id = m.id
            and mp.user_id = p_user_id
        )
      )
  );
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

  if current_match.visibility <> 'PUBLIC'
     and not public.is_match_actor(p_match_id, p_user_id) then
    raise exception 'You do not have access to this match';
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
    set
      status = 'PAYMENT_PENDING',
      updated_at = timezone('utc', now())
    where id = p_match_id;
  end if;

  return current_participant;
end;
$$;

alter table public.matches enable row level security;

create policy "matches_select_actor_or_public"
on public.matches
for select
to authenticated
using (visibility = 'PUBLIC' or public.is_match_actor(id));

create policy "matches_insert_captain"
on public.matches
for insert
to authenticated
with check (captain_id = auth.uid() and public.is_team_captain(team_id));

create policy "matches_update_captain"
on public.matches
for update
to authenticated
using (captain_id = auth.uid())
with check (captain_id = auth.uid());

alter table public.match_participants enable row level security;

create policy "match_participants_select_match_actor"
on public.match_participants
for select
to authenticated
using (public.is_match_actor(match_id) or user_id = auth.uid());

create policy "match_participants_insert_self_or_captain"
on public.match_participants
for insert
to authenticated
with check (user_id = auth.uid() or public.is_match_actor(match_id));

create policy "match_participants_update_self_or_captain"
on public.match_participants
for update
to authenticated
using (user_id = auth.uid() or public.is_match_actor(match_id))
with check (user_id = auth.uid() or public.is_match_actor(match_id));

create table public.match_invites (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  invited_user_id uuid references public.users (id) on delete set null,
  invited_phone text not null,
  invited_name text,
  invited_by uuid not null references public.users (id) on delete restrict,
  token text not null unique default public.generate_short_code() || public.generate_short_code(),
  status public.invite_status not null default 'PENDING',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index match_invites_match_idx on public.match_invites (match_id, status);
create index match_invites_phone_idx on public.match_invites (invited_phone);
create unique index match_invites_pending_phone_idx
  on public.match_invites (match_id, invited_phone)
  where status = 'PENDING';

create trigger match_invites_touch_updated_at
before update on public.match_invites
for each row
execute function public.touch_updated_at();

alter table public.match_participants
  add constraint match_participants_invite_id_fkey
  foreign key (invite_id) references public.match_invites (id) on delete set null;

create or replace function public.expire_match_invites(p_match_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_rows integer;
begin
  update public.match_invites
  set
    status = 'EXPIRED',
    updated_at = timezone('utc', now())
  where status = 'PENDING'
    and expires_at <= timezone('utc', now())
    and (p_match_id is null or match_id = p_match_id);

  get diagnostics affected_rows = row_count;
  return affected_rows;
end;
$$;

create or replace function public.accept_match_invite(
  p_token text,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_invite public.match_invites;
  current_match public.matches;
  current_participant public.match_participants;
begin
  perform public.expire_match_invites();

  select *
  into current_invite
  from public.match_invites
  where token = p_token
  for update;

  if current_invite.id is null then
    raise exception 'Invite not found';
  end if;

  if current_invite.status <> 'PENDING' then
    raise exception 'Invite is no longer active';
  end if;

  if current_invite.invited_user_id is not null
     and current_invite.invited_user_id <> p_user_id then
    raise exception 'Invite is assigned to another user';
  end if;

  select *
  into current_match
  from public.matches
  where id = current_invite.match_id;

  if current_match.status not in ('RSVP_OPEN', 'PAYMENT_PENDING') then
    raise exception 'Match is not accepting invites';
  end if;

  update public.match_invites
  set
    invited_user_id = coalesce(invited_user_id, p_user_id),
    status = 'ACCEPTED',
    accepted_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = current_invite.id
  returning *
  into current_invite;

  insert into public.match_participants (
    match_id,
    user_id,
    invite_id,
    status,
    payment_status
  )
  values (
    current_invite.match_id,
    p_user_id,
    current_invite.id,
    'RSVP',
    'CREATED'
  )
  on conflict (match_id, user_id)
  do update
  set
    invite_id = excluded.invite_id,
    status = case
      when public.match_participants.status in ('CONFIRMED', 'LOCKED', 'PAYMENT_PENDING') then public.match_participants.status
      else 'RSVP'
    end,
    updated_at = timezone('utc', now())
  returning *
  into current_participant;

  return jsonb_build_object(
    'inviteId', current_invite.id,
    'matchId', current_invite.match_id,
    'participantId', current_participant.id,
    'status', current_invite.status
  );
end;
$$;

alter table public.match_invites enable row level security;

create policy "match_invites_select_actor"
on public.match_invites
for select
to authenticated
using (
  public.is_match_actor(match_id)
  or invited_user_id = auth.uid()
);

create policy "match_invites_insert_match_actor"
on public.match_invites
for insert
to authenticated
with check (public.is_match_actor(match_id));

create policy "match_invites_update_match_actor"
on public.match_invites
for update
to authenticated
using (public.is_match_actor(match_id) or invited_user_id = auth.uid())
with check (public.is_match_actor(match_id) or invited_user_id = auth.uid());

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  participant_id uuid references public.match_participants (id) on delete set null,
  amount numeric(10, 2) not null check (amount >= 0),
  currency text not null default 'INR',
  status public.payment_status not null default 'CREATED',
  gateway_order_id text,
  gateway_payment_id text,
  gateway_signature text,
  webhook_event_id text,
  receipt text not null,
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (match_id, user_id)
);

create unique index payments_receipt_idx on public.payments (receipt);
create unique index payments_gateway_order_idx
  on public.payments (gateway_order_id)
  where gateway_order_id is not null;
create unique index payments_gateway_payment_idx
  on public.payments (gateway_payment_id)
  where gateway_payment_id is not null;
create index payments_status_idx on public.payments (match_id, status);

create trigger payments_touch_updated_at
before update on public.payments
for each row
execute function public.touch_updated_at();

create or replace function public.finalize_match_payment(
  p_match_id uuid,
  p_user_id uuid,
  p_payment_id uuid,
  p_gateway_order_id text,
  p_gateway_payment_id text,
  p_gateway_signature text,
  p_event_id text default null,
  p_paid_at timestamptz default timezone('utc', now())
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_payment public.payments;
  current_participant public.match_participants;
begin
  select *
  into current_payment
  from public.payments
  where id = p_payment_id
    and match_id = p_match_id
    and user_id = p_user_id
  for update;

  if current_payment.id is null then
    raise exception 'Payment record not found';
  end if;

  if current_payment.status = 'PAID'
     and coalesce(current_payment.gateway_payment_id, '') = coalesce(p_gateway_payment_id, '') then
    select *
    into current_participant
    from public.match_participants
    where match_id = p_match_id
      and user_id = p_user_id;

    return jsonb_build_object(
      'result', 'PAID',
      'participantStatus', coalesce(current_participant.status::text, 'UNKNOWN'),
      'paymentStatus', current_payment.status::text
    );
  end if;

  perform public.release_expired_participant_holds(p_match_id);

  select *
  into current_participant
  from public.match_participants
  where match_id = p_match_id
    and user_id = p_user_id
  for update;

  if current_participant.id is null then
    update public.payments
    set
      status = 'REFUND_PENDING',
      gateway_order_id = coalesce(p_gateway_order_id, gateway_order_id),
      gateway_payment_id = coalesce(p_gateway_payment_id, gateway_payment_id),
      gateway_signature = coalesce(p_gateway_signature, gateway_signature),
      webhook_event_id = coalesce(webhook_event_id, p_event_id),
      paid_at = coalesce(paid_at, p_paid_at),
      updated_at = timezone('utc', now())
    where id = current_payment.id
    returning *
    into current_payment;

    return jsonb_build_object(
      'result', 'REFUND_PENDING',
      'reason', 'participant_missing',
      'paymentStatus', current_payment.status::text
    );
  end if;

  if current_participant.status in ('CONFIRMED', 'LOCKED') then
    update public.payments
    set
      status = 'PAID',
      gateway_order_id = coalesce(p_gateway_order_id, gateway_order_id),
      gateway_payment_id = coalesce(p_gateway_payment_id, gateway_payment_id),
      gateway_signature = coalesce(p_gateway_signature, gateway_signature),
      webhook_event_id = coalesce(webhook_event_id, p_event_id),
      paid_at = coalesce(paid_at, p_paid_at),
      updated_at = timezone('utc', now())
    where id = current_payment.id
    returning *
    into current_payment;

    return jsonb_build_object(
      'result', 'PAID',
      'participantStatus', current_participant.status::text,
      'paymentStatus', current_payment.status::text
    );
  end if;

  begin
    update public.match_participants
    set
      status = 'CONFIRMED',
      payment_status = 'PAID',
      hold_expires_at = null,
      updated_at = timezone('utc', now())
    where id = current_participant.id
    returning *
    into current_participant;

    update public.payments
    set
      status = 'PAID',
      gateway_order_id = coalesce(p_gateway_order_id, gateway_order_id),
      gateway_payment_id = coalesce(p_gateway_payment_id, gateway_payment_id),
      gateway_signature = coalesce(p_gateway_signature, gateway_signature),
      webhook_event_id = coalesce(webhook_event_id, p_event_id),
      paid_at = coalesce(paid_at, p_paid_at),
      updated_at = timezone('utc', now())
    where id = current_payment.id
    returning *
    into current_payment;

    return jsonb_build_object(
      'result', 'CONFIRMED',
      'participantStatus', current_participant.status::text,
      'paymentStatus', current_payment.status::text
    );
  exception
    when others then
      update public.match_participants
      set
        status = 'WAITLISTED',
        payment_status = 'REFUND_PENDING',
        hold_expires_at = null,
        updated_at = timezone('utc', now())
      where id = current_participant.id
      returning *
      into current_participant;

      update public.payments
      set
        status = 'REFUND_PENDING',
        gateway_order_id = coalesce(p_gateway_order_id, gateway_order_id),
        gateway_payment_id = coalesce(p_gateway_payment_id, gateway_payment_id),
        gateway_signature = coalesce(p_gateway_signature, gateway_signature),
        webhook_event_id = coalesce(webhook_event_id, p_event_id),
        paid_at = coalesce(paid_at, p_paid_at),
        updated_at = timezone('utc', now())
      where id = current_payment.id
      returning *
      into current_payment;

      return jsonb_build_object(
        'result', 'REFUND_PENDING',
        'participantStatus', current_participant.status::text,
        'paymentStatus', current_payment.status::text
      );
  end;
end;
$$;

alter table public.payments enable row level security;

create policy "payments_select_actor"
on public.payments
for select
to authenticated
using (public.is_match_actor(match_id) or user_id = auth.uid());

create policy "payments_insert_self"
on public.payments
for insert
to authenticated
with check (user_id = auth.uid());

create policy "payments_update_self_or_captain"
on public.payments
for update
to authenticated
using (user_id = auth.uid() or public.is_match_actor(match_id))
with check (user_id = auth.uid() or public.is_match_actor(match_id));

create table public.availability (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  slot_label text not null,
  slot_starts_at timestamptz not null,
  slot_ends_at timestamptz not null,
  is_available boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (match_id, user_id, slot_starts_at, slot_ends_at),
  constraint availability_slot_window_check
    check (slot_ends_at > slot_starts_at)
);

create index availability_match_idx on public.availability (match_id, user_id);
create index availability_window_idx on public.availability (slot_starts_at, slot_ends_at);

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
  current_match public.matches;
  current_row public.availability;
begin
  select *
  into current_match
  from public.matches
  where id = p_match_id;

  if current_match.id is null then
    raise exception 'Match not found';
  end if;

  if current_match.visibility <> 'PUBLIC'
     and not public.is_match_actor(p_match_id, p_user_id) then
    raise exception 'You do not have access to this match';
  end if;

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

create policy "availability_select_actor"
on public.availability
for select
to authenticated
using (public.is_match_actor(match_id) or user_id = auth.uid());

create policy "availability_insert_self"
on public.availability
for insert
to authenticated
with check (user_id = auth.uid());

create policy "availability_update_self"
on public.availability
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create table public.reliability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  participant_id uuid references public.match_participants (id) on delete cascade,
  attendance_score numeric(5, 2) not null default 100.00 check (attendance_score between 0 and 100),
  payment_score numeric(5, 2) not null default 100.00 check (payment_score between 0 and 100),
  dropout_penalty numeric(5, 2) not null default 0.00 check (dropout_penalty between 0 and 100),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, match_id)
);

create index reliability_user_idx on public.reliability (user_id);
create index reliability_match_idx on public.reliability (match_id);

create trigger reliability_touch_updated_at
before update on public.reliability
for each row
execute function public.touch_updated_at();

create or replace function public.recalculate_user_reliability(p_user_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  recalculated_score numeric(5, 2);
begin
  select coalesce(
    avg(greatest(0, ((attendance_score + payment_score) / 2.0) - dropout_penalty)),
    100.00
  )
  into recalculated_score
  from public.reliability
  where user_id = p_user_id;

  update public.users
  set reliability_score = recalculated_score
  where id = p_user_id;

  return recalculated_score;
end;
$$;

create or replace function public.sync_reliability_to_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_user_reliability(old.user_id);
    return old;
  end if;

  perform public.recalculate_user_reliability(new.user_id);
  return new;
end;
$$;

create trigger reliability_sync_trigger
after insert or update or delete on public.reliability
for each row
execute function public.sync_reliability_to_user();

alter table public.reliability enable row level security;

create policy "reliability_select_actor"
on public.reliability
for select
to authenticated
using (user_id = auth.uid() or public.is_match_actor(match_id));

create policy "reliability_insert_match_actor"
on public.reliability
for insert
to authenticated
with check (public.is_match_actor(match_id));

create policy "reliability_update_match_actor"
on public.reliability
for update
to authenticated
using (public.is_match_actor(match_id))
with check (public.is_match_actor(match_id));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_rel pr
      join pg_publication p on p.oid = pr.prpubid
      join pg_class c on c.oid = pr.prrelid
      join pg_namespace n on n.oid = c.relnamespace
      where p.pubname = 'supabase_realtime'
        and n.nspname = 'public'
        and c.relname = 'matches'
    ) then
      execute 'alter publication supabase_realtime add table public.matches';
    end if;

    if not exists (
      select 1
      from pg_publication_rel pr
      join pg_publication p on p.oid = pr.prpubid
      join pg_class c on c.oid = pr.prrelid
      join pg_namespace n on n.oid = c.relnamespace
      where p.pubname = 'supabase_realtime'
        and n.nspname = 'public'
        and c.relname = 'match_participants'
    ) then
      execute 'alter publication supabase_realtime add table public.match_participants';
    end if;

    if not exists (
      select 1
      from pg_publication_rel pr
      join pg_publication p on p.oid = pr.prpubid
      join pg_class c on c.oid = pr.prrelid
      join pg_namespace n on n.oid = c.relnamespace
      where p.pubname = 'supabase_realtime'
        and n.nspname = 'public'
        and c.relname = 'payments'
    ) then
      execute 'alter publication supabase_realtime add table public.payments';
    end if;

    if not exists (
      select 1
      from pg_publication_rel pr
      join pg_publication p on p.oid = pr.prpubid
      join pg_class c on c.oid = pr.prrelid
      join pg_namespace n on n.oid = c.relnamespace
      where p.pubname = 'supabase_realtime'
        and n.nspname = 'public'
        and c.relname = 'match_invites'
    ) then
      execute 'alter publication supabase_realtime add table public.match_invites';
    end if;

    if not exists (
      select 1
      from pg_publication_rel pr
      join pg_publication p on p.oid = pr.prpubid
      join pg_class c on c.oid = pr.prrelid
      join pg_namespace n on n.oid = c.relnamespace
      where p.pubname = 'supabase_realtime'
        and n.nspname = 'public'
        and c.relname = 'availability'
    ) then
      execute 'alter publication supabase_realtime add table public.availability';
    end if;
  end if;
end
$$;

commit;
