-- ============================================================
-- Korum Demo Seed v7 — 10 Teams · 150 Players · 30 Matches
-- Run in Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  sports     TEXT[] := ARRAY['Cricket','Football','Basketball','Volleyball','Cricket','Football','Cricket','Basketball','Football','Volleyball'];
  cities     TEXT[] := ARRAY['Chennai','Mumbai','Bangalore','Hyderabad','Chennai','Delhi','Pune','Bangalore','Mumbai','Kolkata'];
  team_names TEXT[] := ARRAY['Chennai Strikers','Mumbai Mavericks','Bangalore Blazers','Hyderabad Hawks','Marina Masters','Delhi Dynamos','Pune Predators','Bangalore Bulls','Mumbai United','Kolkata Kings'];

  fnames TEXT[] := ARRAY['Arjun','Rahul','Vikram','Aditya','Karthik','Suresh','Ravi','Deepak','Amit','Nikhil','Priya','Ananya','Kavya','Sneha','Divya','Rohan','Siddharth','Akash','Vishal','Pranav','Harsh','Kunal','Mohit','Saurabh','Tarun','Varun','Aarav','Ishan','Dhruv','Kabir','Yash','Rishabh','Shubham','Ayaan','Parth','Neha','Riya','Simran','Tanvi','Aisha','Vijay','Sunil','Ramesh','Ganesh','Naresh','Ankit','Gaurav','Sumit','Manish','Vikas','Isha','Bhavna','Riddhi','Tanya','Pallavi','Farhan','Zaid','Imran','Aryan','Kartik','Arun','Balaji','Chandra','Dinesh','Eswar','Faisal','Gopal','Hari','Indra','Jagat','Kiran','Lokesh','Madhav','Nandan','Om','Pavan','Rajiv','Sagar','Tejas','Vijaya','Ashok','Manoj','Sandeep','Praveen','Rajesh','Nitin','Vivek','Abhishek','Rohit','Sachin','Jason','Kevin','Marcus','Liam','Noah','Ethan','Oliver','James','Lucas','Mason','Ajay','Binod','Chirag','Devesh','Eshan','Feroz','Girish','Hemant','Irfan','Jatin','Kapil','Lalit','Murali','Naveen','Omkar','Prem','Qasim','Rajan','Suhas','Vinay','Uday','Alok','Balu','Chetan','Darshan','Eknath','Faiz','Gagan','Hitesh','Ishaan','Javed','Karan','Leela','Mukesh','Nakul','Ojus','Parimal','Raaghav','Sameer','Tanmay','Umesh'];
  lnames TEXT[] := ARRAY['Kumar','Sharma','Singh','Patel','Reddy','Nair','Menon','Pillai','Rao','Iyer','Gupta','Verma','Joshi','Shah','Mehta','Chopra','Malhotra','Kapoor','Bose','Das','Chatterjee','Mukherjee','Banerjee','Ghosh','Roy','Datta','Mishra','Shukla','Tiwari','Pandey','Chaudhary','Yadav','Jain','Agarwal','Srivastava','Saxena','Chauhan','Rajput','Rathore','Thakur','Naidu','Chetty','Gowda','Hegde','Kamath','Shetty','Pai','Bhat','Nayak','Patil'];

  team_ids UUID[] := ARRAY[]::UUID[];
  user_ids UUID[] := ARRAY[]::UUID[];

  i INT; j INT; t INT;
  uid UUID; tid UUID; mid UUID; mid2 UUID; tour_id1 UUID; tour_id2 UUID;
  fname TEXT; lname TEXT; full_name TEXT; phone TEXT; email TEXT;
  starts TIMESTAMPTZ; invite TEXT; slug TEXT;

BEGIN

  -- ── 1. Create 150 users ──────────────────────────────────
  FOR i IN 1..150 LOOP
    uid       := gen_random_uuid();
    fname     := fnames[((i-1) % array_length(fnames,1)) + 1];
    lname     := lnames[((i-1) % array_length(lnames,1)) + 1];
    full_name := fname || ' ' || lname;
    phone     := '+9198' || LPAD(((10000000 + i*7919) % 100000000)::TEXT, 8, '0');
    email     := LOWER(fname) || '.' || LOWER(lname) || i || '@korum.test';

    INSERT INTO auth.users (
      id, instance_id, aud, role,
      email, encrypted_password, email_confirmed_at,
      phone, phone_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, is_super_admin
    ) VALUES (
      uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      email,
      '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      NOW(), phone, NOW(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object(
        'full_name',     full_name,
        'display_name',  fname,
        'default_sport', sports[((i-1) % 10) + 1],
        'city',          cities[((i-1) % 10) + 1]
      ),
      NOW() - ((150-i) * INTERVAL '2 days'),
      NOW(), '', '', FALSE
    ) ON CONFLICT (id) DO NOTHING;

    UPDATE public.users SET
      role              = CASE WHEN i % 15 = 1 THEN 'captain' ELSE 'player' END,
      reliability_score = 75 + (i % 25),
      created_at        = NOW() - ((150-i) * INTERVAL '2 days')
    WHERE id = uid;

    user_ids := array_append(user_ids, uid);
  END LOOP;

  RAISE NOTICE 'Created % users', array_length(user_ids, 1);

  -- ── 2. Create 10 teams + 15 memberships each ────────────
  FOR t IN 1..10 LOOP
    tid    := gen_random_uuid();
    invite := UPPER(SUBSTRING(MD5(tid::TEXT), 1, 6));
    slug   := LOWER(REGEXP_REPLACE(team_names[t], '\s+', '-', 'g'))
              || '-' || LOWER(SUBSTRING(MD5(tid::TEXT), 1, 4));

    INSERT INTO public.teams (
      id, name, slug, sport, city, invite_code,
      captain_id, created_at, updated_at
    ) VALUES (
      tid, team_names[t], slug, sports[t], cities[t], invite,
      user_ids[((t-1)*15) + 1],
      NOW() - ((10-t) * INTERVAL '30 days'),
      NOW()
    ) ON CONFLICT DO NOTHING;

    team_ids := array_append(team_ids, tid);

    FOR j IN 1..15 LOOP
      INSERT INTO public.memberships (
        id, team_id, user_id, role, is_active, joined_at
      ) VALUES (
        gen_random_uuid(),
        tid,
        user_ids[((t-1)*15) + j],
        CASE WHEN j = 1 THEN 'CAPTAIN'::public.membership_role
                        ELSE 'PLAYER'::public.membership_role END,
        TRUE,
        NOW() - ((15-j) * INTERVAL '7 days')
      ) ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Created 10 teams with 15 members each';

  -- ── 3. Create 3 matches per team ────────────────────────
  FOR t IN 1..10 LOOP
    tid := team_ids[t];

    -- Match A: RSVP_OPEN — 3 days out, 8 confirmed + 2 pending
    mid    := gen_random_uuid();
    starts := NOW() + INTERVAL '3 days' + (t * INTERVAL '2 hours');

    INSERT INTO public.matches (
      id, team_id, captain_id, title, sport,
      venue_name, venue_address, starts_at, payment_due_at, lock_at,
      squad_size, price_per_player, status, visibility, join_code,
      notes, created_at, updated_at
    ) VALUES (
      mid, tid, user_ids[((t-1)*15) + 1],
      team_names[t] || ' vs Rivals — Week ' || t, sports[t],
      cities[t] || ' Sports Ground', cities[t] || ', India',
      starts, starts - INTERVAL '3 hours', starts - INTERVAL '1 hour',
      11, (100 + t*25),
      'RSVP_OPEN', 'PUBLIC',
      UPPER(SUBSTRING(MD5(mid::TEXT), 1, 6)),
      'Bring your own kit. Water will be provided.',
      NOW() - INTERVAL '1 day', NOW()
    ) ON CONFLICT DO NOTHING;

    FOR j IN 2..9 LOOP
      INSERT INTO public.match_participants (id, match_id, user_id, status, payment_status, joined_at)
      VALUES (gen_random_uuid(), mid, user_ids[((t-1)*15) + j], 'CONFIRMED', 'PAID', NOW() - ((10-j) * INTERVAL '2 hours'))
      ON CONFLICT DO NOTHING;
    END LOOP;

    FOR j IN 10..11 LOOP
      INSERT INTO public.match_participants (id, match_id, user_id, status, payment_status, joined_at)
      VALUES (gen_random_uuid(), mid, user_ids[((t-1)*15) + j], 'PAYMENT_PENDING', 'PENDING', NOW() - INTERVAL '30 minutes')
      ON CONFLICT DO NOTHING;
    END LOOP;

    -- Match B: LOCKED — tomorrow, full squad
    mid2   := gen_random_uuid();
    starts := NOW() + INTERVAL '1 day' + (t * INTERVAL '1 hour');

    INSERT INTO public.matches (
      id, team_id, captain_id, title, sport,
      venue_name, venue_address, starts_at, payment_due_at, lock_at,
      squad_size, price_per_player, status, visibility, join_code,
      notes, created_at, updated_at
    ) VALUES (
      mid2, tid, user_ids[((t-1)*15) + 1],
      team_names[t] || ' Sunday Showdown', sports[t],
      cities[t] || ' Sports Hub', cities[t] || ', India',
      starts, starts - INTERVAL '3 hours', starts - INTERVAL '1 hour',
      11, 200,
      'LOCKED', 'PUBLIC',
      UPPER(SUBSTRING(MD5(mid2::TEXT), 1, 6)),
      'Squad locked! Strategy Room is open. See you tomorrow.',
      NOW() - INTERVAL '3 days', NOW()
    ) ON CONFLICT DO NOTHING;

    FOR j IN 1..11 LOOP
      INSERT INTO public.match_participants (id, match_id, user_id, status, payment_status, joined_at)
      VALUES (gen_random_uuid(), mid2, user_ids[((t-1)*15) + j], 'LOCKED', 'PAID', NOW() - INTERVAL '2 days')
      ON CONFLICT DO NOTHING;
    END LOOP;

    -- Match C: READY — last week
    mid    := gen_random_uuid();
    starts := NOW() - INTERVAL '7 days' + (t * INTERVAL '3 hours');

    INSERT INTO public.matches (
      id, team_id, captain_id, title, sport,
      venue_name, venue_address, starts_at, payment_due_at, lock_at,
      squad_size, price_per_player, status, visibility, join_code,
      notes, created_at, updated_at
    ) VALUES (
      mid, tid, user_ids[((t-1)*15) + 1],
      team_names[t] || ' — Last Week', sports[t],
      cities[t] || ' Ground', cities[t] || ', India',
      starts, starts - INTERVAL '3 hours', starts - INTERVAL '1 hour',
      11, 150,
      'READY', 'PUBLIC',
      UPPER(SUBSTRING(MD5(mid::TEXT), 1, 6)),
      'Great match! Check the MOTM result.',
      starts - INTERVAL '5 days', NOW()
    ) ON CONFLICT DO NOTHING;

    FOR j IN 1..11 LOOP
      INSERT INTO public.match_participants (id, match_id, user_id, status, payment_status, joined_at)
      VALUES (gen_random_uuid(), mid, user_ids[((t-1)*15) + j], 'LOCKED', 'PAID', starts - INTERVAL '4 days')
      ON CONFLICT DO NOTHING;
    END LOOP;

  END LOOP;

  RAISE NOTICE 'Created 30 matches (3 per team)';

  -- ── 4. Availability checks ───────────────────────────────
  -- Column is captain_id (not created_by). Also insert responses for each member.
  FOR t IN 1..10 LOOP
    INSERT INTO public.availability_checks (
      id, team_id, captain_id, match_date, match_time, venue_hint,
      note, expires_at, created_at
    ) VALUES (
      gen_random_uuid(),
      team_ids[t],
      user_ids[((t-1)*15) + 1],          -- captain_id
      (NOW() + INTERVAL '5 days')::DATE,
      '06:00',
      cities[t] || ' Ground',
      'Who''s free this Sunday morning? Need 11+ replies by Friday!',
      NOW() + INTERVAL '3 days',
      NOW() - INTERVAL '6 hours'
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  -- Seed availability responses (PENDING) for every team member
  INSERT INTO public.availability_responses (id, check_id, user_id, response)
  SELECT
    gen_random_uuid(),
    ac.id,
    m.user_id,
    'PENDING'::public.availability_response
  FROM public.availability_checks ac
  JOIN public.memberships m ON m.team_id = ac.team_id AND m.is_active = TRUE
  WHERE ac.note = 'Who''s free this Sunday morning? Need 11+ replies by Friday!'
  ON CONFLICT (check_id, user_id) DO NOTHING;

  -- Mark a few as already responded for realism
  UPDATE public.availability_responses ar
  SET response = 'AVAILABLE'::public.availability_response,
      responded_at = NOW() - INTERVAL '2 hours'
  FROM public.availability_checks ac
  JOIN public.memberships m ON m.team_id = ac.team_id
  WHERE ar.check_id = ac.id
    AND ar.user_id = m.user_id
    AND m.role = 'CAPTAIN'::public.membership_role;

  RAISE NOTICE 'Created 10 availability checks with responses';

  -- ── 5. Tournaments ───────────────────────────────────────
  tour_id1 := gen_random_uuid();

  INSERT INTO public.tournaments (
    id, name, description, sport, format, status,
    city, venue_name, starts_on, ends_on, registration_closes,
    entry_fee, prize_pool, max_teams, min_teams,
    join_code, organizer_id, rules, created_at, updated_at
  ) VALUES (
    tour_id1,
    'Korum Summer Cricket League 2025',
    'The premier amateur cricket tournament across Chennai. Group stage + knockout. Open to all amateur squads.',
    'Cricket', 'GROUP_KNOCKOUT', 'REGISTRATION_OPEN',
    'Chennai', 'Marina Cricket Ground',
    (NOW() + INTERVAL '14 days')::DATE,
    (NOW() + INTERVAL '30 days')::DATE,
    (NOW() + INTERVAL '10 days')::DATE,
    500, 25000, 12, 6,
    UPPER(SUBSTRING(MD5(tour_id1::TEXT), 1, 6)),
    user_ids[1],
    E'1. Each team: 11 players + 2 subs\n2. 20-over format\n3. DLS applies for rain\n4. No bouncer rule in group stage\n5. Finals: 25 overs per side',
    NOW() - INTERVAL '5 days', NOW()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.tournament_registrations (id, tournament_id, team_id, registered_by, status, registered_at)
  VALUES (gen_random_uuid(), tour_id1, team_ids[1], user_ids[1],  'APPROVED', NOW() - INTERVAL '3 days') ON CONFLICT DO NOTHING;
  INSERT INTO public.tournament_registrations (id, tournament_id, team_id, registered_by, status, registered_at)
  VALUES (gen_random_uuid(), tour_id1, team_ids[5], user_ids[61], 'PENDING',  NOW() - INTERVAL '2 days') ON CONFLICT DO NOTHING;
  INSERT INTO public.tournament_registrations (id, tournament_id, team_id, registered_by, status, registered_at)
  VALUES (gen_random_uuid(), tour_id1, team_ids[7], user_ids[91], 'PENDING',  NOW() - INTERVAL '1 day')  ON CONFLICT DO NOTHING;

  tour_id2 := gen_random_uuid();

  INSERT INTO public.tournaments (
    id, name, description, sport, format, status,
    city, venue_name, starts_on, ends_on, registration_closes,
    entry_fee, prize_pool, max_teams, min_teams,
    join_code, organizer_id, rules, created_at, updated_at
  ) VALUES (
    tour_id2,
    'Mumbai 5-a-Side Football Cup',
    'Fast-paced 5-a-side football. 8 teams, knockout. One day, one champion.',
    'Football', 'KNOCKOUT', 'REGISTRATION_OPEN',
    'Mumbai', 'Mumbai Football Arena',
    (NOW() + INTERVAL '21 days')::DATE,
    (NOW() + INTERVAL '22 days')::DATE,
    (NOW() + INTERVAL '18 days')::DATE,
    300, 15000, 8, 4,
    UPPER(SUBSTRING(MD5(tour_id2::TEXT), 1, 6)),
    user_ids[16],
    E'1. 5 players on field at all times\n2. Rolling substitutions\n3. 15-minute halves\n4. No slide tackles\n5. Golden goal in knockout',
    NOW() - INTERVAL '3 days', NOW()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.tournament_registrations (id, tournament_id, team_id, registered_by, status, registered_at)
  VALUES (gen_random_uuid(), tour_id2, team_ids[2], user_ids[16],  'APPROVED', NOW() - INTERVAL '2 days') ON CONFLICT DO NOTHING;
  INSERT INTO public.tournament_registrations (id, tournament_id, team_id, registered_by, status, registered_at)
  VALUES (gen_random_uuid(), tour_id2, team_ids[6], user_ids[76],  'APPROVED', NOW() - INTERVAL '2 days') ON CONFLICT DO NOTHING;
  INSERT INTO public.tournament_registrations (id, tournament_id, team_id, registered_by, status, registered_at)
  VALUES (gen_random_uuid(), tour_id2, team_ids[9], user_ids[121], 'APPROVED', NOW() - INTERVAL '1 day')  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created 2 tournaments with registrations';

  -- ── 6. Vendors ───────────────────────────────────────────
  INSERT INTO public.vendors (id, name, category, description, city, contact_phone, price_note, sports, is_verified, created_at, updated_at) VALUES
    (gen_random_uuid(), 'SportZone Chennai',  'Kit',         'Premium cricket & football kits, custom jerseys, 48hr delivery.',  'Chennai',   '+918012345678', 'Jerseys from ₹350', ARRAY['Cricket','Football'],               TRUE,  NOW(), NOW()),
    (gen_random_uuid(), 'Pro Cricket Mumbai', 'Equipment',   'Bats, pads, gloves, helmets. Bulk discounts for teams.',           'Mumbai',    '+919012345679', 'Bats from ₹800',   ARRAY['Cricket'],                          TRUE,  NOW(), NOW()),
    (gen_random_uuid(), 'GameOn Sports',      'Equipment',   'Footballs, cones, bibs, goals for training.',                      'Bangalore', '+917012345680', 'Balls from ₹500',  ARRAY['Football','Cricket'],               FALSE, NOW(), NOW()),
    (gen_random_uuid(), 'FitFuel Nutrition',  'Food',        'Pre/post match nutrition packs, protein bars, electrolytes.',      'Chennai',   '+916012345681', 'Packs from ₹120',  ARRAY['Cricket','Football','Basketball'],  TRUE,  NOW(), NOW()),
    (gen_random_uuid(), 'SnapShot Sports',    'Photography', 'Professional match photography & highlight reels.',                'Hyderabad', '+915012345682', '₹1500 per match',  ARRAY['Cricket','Football'],               FALSE, NOW(), NOW()),
    (gen_random_uuid(), 'RapidKit Bangalore', 'Kit',         'Next-day kit delivery. Custom name printing on jerseys.',          'Bangalore', '+914012345683', 'Jerseys from ₹299',ARRAY['Football','Basketball','Volleyball'],TRUE,  NOW(), NOW()),
    (gen_random_uuid(), 'PhysioFirst Delhi',  'Physio',      'Certified sports physios for match-day injury support.',           'Delhi',     '+913012345684', '₹800 per session', ARRAY['Cricket','Football'],               TRUE,  NOW(), NOW()),
    (gen_random_uuid(), 'TeamRide Mumbai',    'Transport',   'AC coach hire for away matches. 17 & 26 seaters.',                 'Mumbai',    '+912012345685', 'From ₹2500/trip',  ARRAY['Cricket','Football','Basketball'],  FALSE, NOW(), NOW())
  ON CONFLICT DO NOTHING;

  -- ── 7. Grounds ────────────────────────────────────────────
  INSERT INTO public.grounds (id, name, address, city, state, sport, surface, capacity, price_per_hour, amenities, contact_phone, is_verified, lat, lng, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Marina Cricket Ground',    'Marina Beach Rd',    'Chennai',   'Tamil Nadu',  ARRAY['Cricket'],                        'Turf',           500, 1500, ARRAY['Floodlights','Parking','Changing Room','Water','Scoreboard'], '+918011112222', TRUE,  13.0499, 80.2824, NOW(), NOW()),
    (gen_random_uuid(), 'Chennai Football Arena',   'Anna Nagar',         'Chennai',   'Tamil Nadu',  ARRAY['Football'],                       'Artificial Turf',200, 1200, ARRAY['Floodlights','Parking','Toilets'],                            '+918022223333', TRUE,  13.0836, 80.2094, NOW(), NOW()),
    (gen_random_uuid(), 'Mumbai Football Arena',    'Bandra',             'Mumbai',    'Maharashtra', ARRAY['Football'],                       'Natural Grass',  300, 1800, ARRAY['Floodlights','Parking','Changing Room','Cafeteria'],          '+919022223333', TRUE,  19.0544, 72.8405, NOW(), NOW()),
    (gen_random_uuid(), 'Bangalore Sports Complex', 'Koramangala',        'Bangalore', 'Karnataka',   ARRAY['Cricket','Football','Basketball'], 'Multi',          400, 2000, ARRAY['Floodlights','AC Changing Room','Parking','Cafeteria'],      '+917011112222', TRUE,  12.9352, 77.6245, NOW(), NOW()),
    (gen_random_uuid(), 'Hyderabad Cricket Ground', 'Banjara Hills',      'Hyderabad', 'Telangana',   ARRAY['Cricket'],                        'Turf',           350, 1400, ARRAY['Floodlights','Parking','Water'],                             '+916011112222', TRUE,  17.4126, 78.4429, NOW(), NOW()),
    (gen_random_uuid(), 'Delhi Sports Hub',         'Dwarka, New Delhi',  'Delhi',     'Delhi',       ARRAY['Football','Basketball'],          'Artificial Turf',250, 1600, ARRAY['Floodlights','Parking','Changing Room'],                     '+913011112222', FALSE, 28.5921, 77.0460, NOW(), NOW()),
    (gen_random_uuid(), 'Pune Box Cricket',         'Kharadi, Pune',      'Pune',      'Maharashtra', ARRAY['Cricket'],                        'Turf',            80, 1000, ARRAY['Floodlights','Water'],                                       '+912011112222', TRUE,  18.5508, 73.9462, NOW(), NOW()),
    (gen_random_uuid(), 'Kolkata Football Park',    'Salt Lake, Kolkata', 'Kolkata',   'West Bengal', ARRAY['Football'],                       'Natural Grass',  400, 1300, ARRAY['Floodlights','Parking','Canteen'],                           '+918099998888', FALSE, 22.5744, 88.3629, NOW(), NOW())
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'SEED COMPLETE';
  RAISE NOTICE '150 users | 10 teams | 30 matches';
  RAISE NOTICE '10 availability checks with responses';
  RAISE NOTICE '2 tournaments | 8 vendors | 8 grounds';
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE 'Captain: arjun.kumar1@korum.test';
  RAISE NOTICE 'Password: password';
  RAISE NOTICE '========================================';

END $$;
