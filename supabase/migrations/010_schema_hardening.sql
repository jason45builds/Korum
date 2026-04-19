update public.users
set phone = null
where nullif(btrim(phone), '') is null;

alter table public.users
  alter column phone drop not null;

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

update public.matches
set payment_due_at = null
where payment_due_at is not null
  and payment_due_at >= starts_at;

update public.matches
set lock_at = null
where lock_at is not null
  and lock_at > starts_at;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'matches'
      and constraint_name = 'matches_payment_due_before_start_check'
  ) then
    alter table public.matches
      add constraint matches_payment_due_before_start_check
      check (payment_due_at is null or payment_due_at < starts_at);
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'matches'
      and constraint_name = 'matches_lock_before_start_check'
  ) then
    alter table public.matches
      add constraint matches_lock_before_start_check
      check (lock_at is null or lock_at <= starts_at);
  end if;
end
$$;

create unique index if not exists match_invites_pending_phone_idx
  on public.match_invites (match_id, invited_phone)
  where status = 'PENDING';

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
