do $$
declare
  captain_user_id uuid;
  player_user_id uuid;
  extra_user_id uuid;
  seeded_team_id uuid;
  seeded_match_id uuid;
  seeded_participant_id uuid;
begin
  select id into captain_user_id from auth.users order by created_at asc limit 1;
  select id into player_user_id from auth.users where id <> captain_user_id order by created_at asc limit 1;
  select id into extra_user_id from auth.users where id not in (captain_user_id, coalesce(player_user_id, captain_user_id)) order by created_at asc limit 1;

  if captain_user_id is null then
    raise notice 'Seed skipped: create at least one auth user first.';
    return;
  end if;

  if player_user_id is null then
    player_user_id := captain_user_id;
  end if;

  insert into public.users (id, phone, full_name, display_name, city, default_sport, role)
  values
    (captain_user_id, '+910000000001', 'Captain Seed', 'Captain Seed', 'Bengaluru', 'Football', 'captain'),
    (player_user_id, '+910000000002', 'Player Seed', 'Player Seed', 'Bengaluru', 'Football', 'player')
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    display_name = excluded.display_name,
    city = excluded.city,
    default_sport = excluded.default_sport,
    role = excluded.role;

  insert into public.teams (name, slug, sport, city, captain_id)
  values ('Korum City FC', 'korum-city-fc', 'Football', 'Bengaluru', captain_user_id)
  on conflict (slug) do update
  set
    captain_id = excluded.captain_id,
    updated_at = timezone('utc', now())
  returning id
  into seeded_team_id;

  insert into public.memberships (team_id, user_id, role, is_active)
  values
    (seeded_team_id, captain_user_id, 'CAPTAIN', true),
    (seeded_team_id, player_user_id, 'PLAYER', true)
  on conflict (team_id, user_id) do update
  set
    role = excluded.role,
    is_active = true,
    updated_at = timezone('utc', now());

  insert into public.matches (
    team_id,
    captain_id,
    title,
    sport,
    venue_name,
    venue_address,
    starts_at,
    payment_due_at,
    lock_at,
    squad_size,
    price_per_player,
    status,
    visibility,
    notes
  )
  values (
    seeded_team_id,
    captain_user_id,
    'Saturday Turf Booking',
    'Football',
    'Korum Arena',
    'Outer Ring Road, Bengaluru',
    timezone('utc', now()) + interval '2 day',
    timezone('utc', now()) + interval '1 day',
    timezone('utc', now()) + interval '36 hour',
    10,
    250,
    'PAYMENT_PENDING',
    'TEAM',
    'Arrive 20 minutes early for bibs and warm-up.'
  )
  returning id
  into seeded_match_id;

  insert into public.match_participants (
    match_id,
    user_id,
    status,
    payment_status,
    joined_at
  )
  values (
    seeded_match_id,
    player_user_id,
    'CONFIRMED',
    'PAID',
    timezone('utc', now())
  )
  on conflict (match_id, user_id) do update
  set
    status = excluded.status,
    payment_status = excluded.payment_status,
    updated_at = timezone('utc', now())
  returning id
  into seeded_participant_id;

  insert into public.payments (
    match_id,
    user_id,
    participant_id,
    amount,
    currency,
    status,
    gateway_order_id,
    gateway_payment_id,
    receipt,
    paid_at
  )
  values (
    seeded_match_id,
    player_user_id,
    seeded_participant_id,
    250,
    'INR',
    'PAID',
    'order_seed_001',
    'pay_seed_001',
    'receipt-seed-001',
    timezone('utc', now())
  )
  on conflict (match_id, user_id) do update
  set
    participant_id = excluded.participant_id,
    amount = excluded.amount,
    status = excluded.status,
    gateway_order_id = excluded.gateway_order_id,
    gateway_payment_id = excluded.gateway_payment_id,
    receipt = excluded.receipt,
    paid_at = excluded.paid_at,
    updated_at = timezone('utc', now());

  insert into public.availability (
    match_id,
    user_id,
    slot_label,
    slot_starts_at,
    slot_ends_at,
    is_available
  )
  values (
    seeded_match_id,
    player_user_id,
    'Friday evening',
    timezone('utc', now()) + interval '1 day',
    timezone('utc', now()) + interval '1 day 2 hour',
    true
  )
  on conflict (match_id, user_id, slot_starts_at, slot_ends_at) do update
  set
    slot_label = excluded.slot_label,
    is_available = excluded.is_available,
    updated_at = timezone('utc', now());

  insert into public.reliability (
    user_id,
    match_id,
    participant_id,
    attendance_score,
    payment_score,
    dropout_penalty,
    notes
  )
  values (
    player_user_id,
    seeded_match_id,
    seeded_participant_id,
    95,
    100,
    0,
    'Seed player with strong readiness behaviour.'
  )
  on conflict (user_id, match_id) do update
  set
    attendance_score = excluded.attendance_score,
    payment_score = excluded.payment_score,
    dropout_penalty = excluded.dropout_penalty,
    notes = excluded.notes,
    updated_at = timezone('utc', now());

  if extra_user_id is not null then
    insert into public.users (id, phone, full_name, display_name, city, default_sport, role)
    values (extra_user_id, '+910000000003', 'Invite Seed', 'Invite Seed', 'Bengaluru', 'Football', 'player')
    on conflict (id) do nothing;

    insert into public.match_invites (
      match_id,
      invited_user_id,
      invited_phone,
      invited_name,
      invited_by,
      expires_at
    )
    values (
      seeded_match_id,
      extra_user_id,
      '+910000000003',
      'Invite Seed',
      captain_user_id,
      timezone('utc', now()) + interval '8 hour'
    )
    on conflict do nothing;
  end if;
end
$$;
