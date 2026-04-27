-- ═══════════════════════════════════════════════════════════════════════════
-- KORUM TOP-UP SEED
-- Adds to existing data without touching anything already seeded.
-- Result: 4 full teams × 11 players each.
--
-- What this does:
--   1. Adds 10 players to "Desert Wings Cricket Club" (jason454a's team)
--   2. Creates Team C: Chennai Challengers CC (11 players)
--   3. Creates Team D: Velachery Royals CC    (11 players)
--   4. Adds availability checks + notifications for Teams C & D
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 0: Clean any previous top-up attempt (safe re-run)
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_topup_ids uuid[] := array[
    -- Team C captain + 10 players
    'cc000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000005',
    'c0000000-0000-0000-0000-000000000006','c0000000-0000-0000-0000-000000000007',
    'c0000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000009',
    'c0000000-0000-0000-0000-000000000010','c0000000-0000-0000-0000-000000000011',
    -- Team D captain + 10 players
    'dd000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000003',
    'd0000000-0000-0000-0000-000000000004','d0000000-0000-0000-0000-000000000005',
    'd0000000-0000-0000-0000-000000000006','d0000000-0000-0000-0000-000000000007',
    'd0000000-0000-0000-0000-000000000008','d0000000-0000-0000-0000-000000000009',
    'd0000000-0000-0000-0000-000000000010','d0000000-0000-0000-0000-000000000011',
    -- 10 extra players for Desert Wings Cricket Club
    'e0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-000000000004',
    'e0000000-0000-0000-0000-000000000005','e0000000-0000-0000-0000-000000000006',
    'e0000000-0000-0000-0000-000000000007','e0000000-0000-0000-0000-000000000008',
    'e0000000-0000-0000-0000-000000000009','e0000000-0000-0000-0000-000000000010'
  ];
begin
  delete from public.availability_responses where check_id in (
    'c1c1c1c1-0000-0000-0000-000000000001',
    'd1d1d1d1-0000-0000-0000-000000000001'
  );
  delete from public.availability_checks where id in (
    'c1c1c1c1-0000-0000-0000-000000000001',
    'd1d1d1d1-0000-0000-0000-000000000001'
  );
  delete from public.notifications where user_id = any(v_topup_ids);
  delete from public.memberships where team_id in (
    'cccccccc-0000-0000-0000-000000000002',
    'dddddddd-0000-0000-0000-000000000002'
  );
  delete from public.memberships
    where user_id = any(v_topup_ids)
      and team_id = '80ce7f05-a45c-44b6-bf6e-e07727bb99d4';
  delete from public.teams where id in (
    'cccccccc-0000-0000-0000-000000000002',
    'dddddddd-0000-0000-0000-000000000002'
  );
  delete from public.users  where id = any(v_topup_ids);
  delete from auth.users    where id = any(v_topup_ids);
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: auth.users for all new players
-- Trigger auto-creates public.users for each one
-- ─────────────────────────────────────────────────────────────────────────────
insert into auth.users (
  id, instance_id, aud, role,
  email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_user_meta_data, is_sso_user, deleted_at
)
select
  id::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  email,
  '$2a$10$PNkxGn4hnzNFPjOEWHPBIeHYGEJFGI7L5XKsYMQWkDTi9Ml9eN/7u',
  now(), now(), now(),
  meta::jsonb, false, null
from (values
  -- ── Desert Wings Cricket Club top-up players (e-series) ──────────────
  ('e0000000-0000-0000-0000-000000000001','seed_e01@korum.test','{"full_name":"Rohit Verma",    "display_name":"Rohit",    "phone":"seed-e01","default_sport":"Cricket","city":"Chennai"}'),
  ('e0000000-0000-0000-0000-000000000002','seed_e02@korum.test','{"full_name":"Pooja Suresh",   "display_name":"Pooja",    "phone":"seed-e02","default_sport":"Cricket","city":"Chennai"}'),
  ('e0000000-0000-0000-0000-000000000003','seed_e03@korum.test','{"full_name":"Arun Selvam",    "display_name":"Arun",     "phone":"seed-e03","default_sport":"Cricket","city":"Chennai"}'),
  ('e0000000-0000-0000-0000-000000000004','seed_e04@korum.test','{"full_name":"Nandini Raj",    "display_name":"Nandini",  "phone":"seed-e04","default_sport":"Cricket","city":"Chennai"}'),
  ('e0000000-0000-0000-0000-000000000005','seed_e05@korum.test','{"full_name":"Surya Prakash",  "display_name":"Surya",    "phone":"seed-e05","default_sport":"Cricket","city":"Chennai"}'),
  ('e0000000-0000-0000-0000-000000000006','seed_e06@korum.test','{"full_name":"Geetha Raman",   "display_name":"Geetha",   "phone":"seed-e06","default_sport":"Cricket","city":"Chennai"}'),
  ('e0000000-0000-0000-0000-000000000007','seed_e07@korum.test','{"full_name":"Vijay Kumar",    "display_name":"Vijay",    "phone":"seed-e07","default_sport":"Cricket","city":"Chennai"}'),
  ('e0000000-0000-0000-0000-000000000008','seed_e08@korum.test','{"full_name":"Preethi Nair",   "display_name":"Preethi",  "phone":"seed-e08","default_sport":"Cricket","city":"Chennai"}'),
  ('e0000000-0000-0000-0000-000000000009','seed_e09@korum.test','{"full_name":"Manoj Pillai",   "display_name":"Manoj",    "phone":"seed-e09","default_sport":"Cricket","city":"Chennai"}'),
  ('e0000000-0000-0000-0000-000000000010','seed_e10@korum.test','{"full_name":"Shruthi Das",    "display_name":"Shruthi",  "phone":"seed-e10","default_sport":"Cricket","city":"Chennai"}'),

  -- ── Team C: Chennai Challengers CC (cc/c-series) ─────────────────────
  ('cc000000-0000-0000-0000-000000000001','seed_cap_c@korum.test','{"full_name":"Kiran Bose",     "display_name":"Kiran",    "phone":"seed-cap-c","default_sport":"Cricket","city":"Chennai"}'),
  ('c0000000-0000-0000-0000-000000000002','seed_c02@korum.test', '{"full_name":"Priya Mohan",    "display_name":"Priya M",  "phone":"seed-c02","default_sport":"Cricket","city":"Chennai"}'),
  ('c0000000-0000-0000-0000-000000000003','seed_c03@korum.test', '{"full_name":"Akash Reddy",    "display_name":"Akash",    "phone":"seed-c03","default_sport":"Cricket","city":"Chennai"}'),
  ('c0000000-0000-0000-0000-000000000004','seed_c04@korum.test', '{"full_name":"Divya Menon",    "display_name":"Divya M",  "phone":"seed-c04","default_sport":"Cricket","city":"Chennai"}'),
  ('c0000000-0000-0000-0000-000000000005','seed_c05@korum.test', '{"full_name":"Sanjay Gupta",   "display_name":"Sanjay",   "phone":"seed-c05","default_sport":"Cricket","city":"Chennai"}'),
  ('c0000000-0000-0000-0000-000000000006','seed_c06@korum.test', '{"full_name":"Anitha Kumar",   "display_name":"Anitha",   "phone":"seed-c06","default_sport":"Cricket","city":"Chennai"}'),
  ('c0000000-0000-0000-0000-000000000007','seed_c07@korum.test', '{"full_name":"Deepak Rao",     "display_name":"Deepak",   "phone":"seed-c07","default_sport":"Cricket","city":"Chennai"}'),
  ('c0000000-0000-0000-0000-000000000008','seed_c08@korum.test', '{"full_name":"Lakshmi Priya",  "display_name":"Lakshmi P","phone":"seed-c08","default_sport":"Cricket","city":"Chennai"}'),
  ('c0000000-0000-0000-0000-000000000009','seed_c09@korum.test', '{"full_name":"Arjun Das",      "display_name":"Arjun D",  "phone":"seed-c09","default_sport":"Cricket","city":"Chennai"}'),
  ('c0000000-0000-0000-0000-000000000010','seed_c10@korum.test', '{"full_name":"Kavitha Pillai", "display_name":"Kavitha",  "phone":"seed-c10","default_sport":"Cricket","city":"Chennai"}'),
  ('c0000000-0000-0000-0000-000000000011','seed_c11@korum.test', '{"full_name":"Suresh Menon",   "display_name":"Suresh M", "phone":"seed-c11","default_sport":"Cricket","city":"Chennai"}'),

  -- ── Team D: Velachery Royals CC (dd/d-series) ─────────────────────────
  ('dd000000-0000-0000-0000-000000000001','seed_cap_d@korum.test','{"full_name":"Meena Shankar",  "display_name":"Meena",    "phone":"seed-cap-d","default_sport":"Cricket","city":"Chennai"}'),
  ('d0000000-0000-0000-0000-000000000002','seed_d02@korum.test', '{"full_name":"Rajan Nair",     "display_name":"Rajan",    "phone":"seed-d02","default_sport":"Cricket","city":"Chennai"}'),
  ('d0000000-0000-0000-0000-000000000003','seed_d03@korum.test', '{"full_name":"Sowmya Iyer",    "display_name":"Sowmya",   "phone":"seed-d03","default_sport":"Cricket","city":"Chennai"}'),
  ('d0000000-0000-0000-0000-000000000004','seed_d04@korum.test', '{"full_name":"Venkat Raj",     "display_name":"Venkat",   "phone":"seed-d04","default_sport":"Cricket","city":"Chennai"}'),
  ('d0000000-0000-0000-0000-000000000005','seed_d05@korum.test', '{"full_name":"Hema Krishnan",  "display_name":"Hema",     "phone":"seed-d05","default_sport":"Cricket","city":"Chennai"}'),
  ('d0000000-0000-0000-0000-000000000006','seed_d06@korum.test', '{"full_name":"Muthukumar K",   "display_name":"Muthu",    "phone":"seed-d06","default_sport":"Cricket","city":"Chennai"}'),
  ('d0000000-0000-0000-0000-000000000007','seed_d07@korum.test', '{"full_name":"Saranya Patel",  "display_name":"Saranya",  "phone":"seed-d07","default_sport":"Cricket","city":"Chennai"}'),
  ('d0000000-0000-0000-0000-000000000008','seed_d08@korum.test', '{"full_name":"Balaji Sundar",  "display_name":"Balaji",   "phone":"seed-d08","default_sport":"Cricket","city":"Chennai"}'),
  ('d0000000-0000-0000-0000-000000000009','seed_d09@korum.test', '{"full_name":"Rekha Balan",    "display_name":"Rekha",    "phone":"seed-d09","default_sport":"Cricket","city":"Chennai"}'),
  ('d0000000-0000-0000-0000-000000000010','seed_d10@korum.test', '{"full_name":"Prasanth Nair",  "display_name":"Prasanth", "phone":"seed-d10","default_sport":"Cricket","city":"Chennai"}'),
  ('d0000000-0000-0000-0000-000000000011','seed_d11@korum.test', '{"full_name":"Uma Devi",       "display_name":"Uma",      "phone":"seed-d11","default_sport":"Cricket","city":"Chennai"}')
) as t(id, email, meta)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Set reliability scores for new players
-- ─────────────────────────────────────────────────────────────────────────────
update public.users set reliability_score = 91 where id = 'e0000000-0000-0000-0000-000000000001';
update public.users set reliability_score = 87 where id = 'e0000000-0000-0000-0000-000000000002';
update public.users set reliability_score = 78 where id = 'e0000000-0000-0000-0000-000000000003';
update public.users set reliability_score = 93 where id = 'e0000000-0000-0000-0000-000000000004';
update public.users set reliability_score = 65 where id = 'e0000000-0000-0000-0000-000000000005';
update public.users set reliability_score = 88 where id = 'e0000000-0000-0000-0000-000000000006';
update public.users set reliability_score = 72 where id = 'e0000000-0000-0000-0000-000000000007';
update public.users set reliability_score = 95 where id = 'e0000000-0000-0000-0000-000000000008';
update public.users set reliability_score = 81 where id = 'e0000000-0000-0000-0000-000000000009';
update public.users set reliability_score = 89 where id = 'e0000000-0000-0000-0000-000000000010';

update public.users set reliability_score = 97, role = 'captain' where id = 'cc000000-0000-0000-0000-000000000001';
update public.users set reliability_score = 83 where id = 'c0000000-0000-0000-0000-000000000002';
update public.users set reliability_score = 90 where id = 'c0000000-0000-0000-0000-000000000003';
update public.users set reliability_score = 76 where id = 'c0000000-0000-0000-0000-000000000004';
update public.users set reliability_score = 86 where id = 'c0000000-0000-0000-0000-000000000005';
update public.users set reliability_score = 69 where id = 'c0000000-0000-0000-0000-000000000006';
update public.users set reliability_score = 94 where id = 'c0000000-0000-0000-0000-000000000007';
update public.users set reliability_score = 79 where id = 'c0000000-0000-0000-0000-000000000008';
update public.users set reliability_score = 88 where id = 'c0000000-0000-0000-0000-000000000009';
update public.users set reliability_score = 73 where id = 'c0000000-0000-0000-0000-000000000010';
update public.users set reliability_score = 85 where id = 'c0000000-0000-0000-0000-000000000011';

update public.users set reliability_score = 94, role = 'captain' where id = 'dd000000-0000-0000-0000-000000000001';
update public.users set reliability_score = 80 where id = 'd0000000-0000-0000-0000-000000000002';
update public.users set reliability_score = 92 where id = 'd0000000-0000-0000-0000-000000000003';
update public.users set reliability_score = 68 where id = 'd0000000-0000-0000-0000-000000000004';
update public.users set reliability_score = 87 where id = 'd0000000-0000-0000-0000-000000000005';
update public.users set reliability_score = 74 where id = 'd0000000-0000-0000-0000-000000000006';
update public.users set reliability_score = 91 where id = 'd0000000-0000-0000-0000-000000000007';
update public.users set reliability_score = 63 where id = 'd0000000-0000-0000-0000-000000000008';
update public.users set reliability_score = 85 where id = 'd0000000-0000-0000-0000-000000000009';
update public.users set reliability_score = 77 where id = 'd0000000-0000-0000-0000-000000000010';
update public.users set reliability_score = 89 where id = 'd0000000-0000-0000-0000-000000000011';

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: Teams C and D
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.teams (id, name, slug, sport, city, captain_id, invite_code) values
  ('cccccccc-0000-0000-0000-000000000002',
   'Chennai Challengers CC', 'seed-chennai-challengers-cc', 'Cricket', 'Chennai',
   'cc000000-0000-0000-0000-000000000001', 'CHALLCC1'),
  ('dddddddd-0000-0000-0000-000000000002',
   'Velachery Royals CC', 'seed-velachery-royals-cc', 'Cricket', 'Chennai',
   'dd000000-0000-0000-0000-000000000001', 'ROYALCC1')
on conflict (slug) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: Memberships
-- ─────────────────────────────────────────────────────────────────────────────

-- Desert Wings Cricket Club: add 10 new players (jason454a already member as captain)
insert into public.memberships (user_id, team_id, role, is_active)
select id, '80ce7f05-a45c-44b6-bf6e-e07727bb99d4', 'PLAYER', true
from unnest(array[
  'e0000000-0000-0000-0000-000000000001'::uuid,
  'e0000000-0000-0000-0000-000000000002',
  'e0000000-0000-0000-0000-000000000003',
  'e0000000-0000-0000-0000-000000000004',
  'e0000000-0000-0000-0000-000000000005',
  'e0000000-0000-0000-0000-000000000006',
  'e0000000-0000-0000-0000-000000000007',
  'e0000000-0000-0000-0000-000000000008',
  'e0000000-0000-0000-0000-000000000009',
  'e0000000-0000-0000-0000-000000000010'
]) as id
on conflict (user_id, team_id) do nothing;

-- Team C: Chennai Challengers CC
insert into public.memberships (user_id, team_id, role, is_active) values
  ('cc000000-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000002','CAPTAIN',true),
  ('c0000000-0000-0000-0000-000000000002','cccccccc-0000-0000-0000-000000000002','PLAYER', true),
  ('c0000000-0000-0000-0000-000000000003','cccccccc-0000-0000-0000-000000000002','PLAYER', true),
  ('c0000000-0000-0000-0000-000000000004','cccccccc-0000-0000-0000-000000000002','PLAYER', true),
  ('c0000000-0000-0000-0000-000000000005','cccccccc-0000-0000-0000-000000000002','PLAYER', true),
  ('c0000000-0000-0000-0000-000000000006','cccccccc-0000-0000-0000-000000000002','PLAYER', true),
  ('c0000000-0000-0000-0000-000000000007','cccccccc-0000-0000-0000-000000000002','PLAYER', true),
  ('c0000000-0000-0000-0000-000000000008','cccccccc-0000-0000-0000-000000000002','PLAYER', true),
  ('c0000000-0000-0000-0000-000000000009','cccccccc-0000-0000-0000-000000000002','PLAYER', true),
  ('c0000000-0000-0000-0000-000000000010','cccccccc-0000-0000-0000-000000000002','PLAYER', true),
  ('c0000000-0000-0000-0000-000000000011','cccccccc-0000-0000-0000-000000000002','PLAYER', true)
on conflict (user_id, team_id) do nothing;

-- Team D: Velachery Royals CC
insert into public.memberships (user_id, team_id, role, is_active) values
  ('dd000000-0000-0000-0000-000000000001','dddddddd-0000-0000-0000-000000000002','CAPTAIN',true),
  ('d0000000-0000-0000-0000-000000000002','dddddddd-0000-0000-0000-000000000002','PLAYER', true),
  ('d0000000-0000-0000-0000-000000000003','dddddddd-0000-0000-0000-000000000002','PLAYER', true),
  ('d0000000-0000-0000-0000-000000000004','dddddddd-0000-0000-0000-000000000002','PLAYER', true),
  ('d0000000-0000-0000-0000-000000000005','dddddddd-0000-0000-0000-000000000002','PLAYER', true),
  ('d0000000-0000-0000-0000-000000000006','dddddddd-0000-0000-0000-000000000002','PLAYER', true),
  ('d0000000-0000-0000-0000-000000000007','dddddddd-0000-0000-0000-000000000002','PLAYER', true),
  ('d0000000-0000-0000-0000-000000000008','dddddddd-0000-0000-0000-000000000002','PLAYER', true),
  ('d0000000-0000-0000-0000-000000000009','dddddddd-0000-0000-0000-000000000002','PLAYER', true),
  ('d0000000-0000-0000-0000-000000000010','dddddddd-0000-0000-0000-000000000002','PLAYER', true),
  ('d0000000-0000-0000-0000-000000000011','dddddddd-0000-0000-0000-000000000002','PLAYER', true)
on conflict (user_id, team_id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5: Availability checks for Teams C and D
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.availability_checks (
  id, team_id, captain_id, match_date, match_time, venue_hint, note, expires_at
) values
  ('c1c1c1c1-0000-0000-0000-000000000001',
   'cccccccc-0000-0000-0000-000000000002',
   'cc000000-0000-0000-0000-000000000001',
   (now() + interval '5 days')::date, '06:00',
   'Kotturpuram Ground, Chennai',
   'First league match — need all 11. Reply ASAP!',
   now() + interval '4 days'),
  ('d1d1d1d1-0000-0000-0000-000000000001',
   'dddddddd-0000-0000-0000-000000000002',
   'dd000000-0000-0000-0000-000000000001',
   (now() + interval '6 days')::date, '07:00',
   'Velachery Sports Complex',
   'Practice match vs Challengers. Confirm by tomorrow.',
   now() + interval '3 days')
on conflict (id) do nothing;

-- Pre-populate some responses for Team C
insert into public.availability_responses (check_id, user_id, response, responded_at) values
  ('c1c1c1c1-0000-0000-0000-000000000001','cc000000-0000-0000-0000-000000000001','AVAILABLE',  now()),
  ('c1c1c1c1-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002','AVAILABLE',  now()),
  ('c1c1c1c1-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000003','AVAILABLE',  now()),
  ('c1c1c1c1-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000004','MAYBE',      now()),
  ('c1c1c1c1-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000005','UNAVAILABLE',now())
on conflict (check_id, user_id) do nothing;

-- Pre-populate some responses for Team D
insert into public.availability_responses (check_id, user_id, response, responded_at) values
  ('d1d1d1d1-0000-0000-0000-000000000001','dd000000-0000-0000-0000-000000000001','AVAILABLE',  now()),
  ('d1d1d1d1-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002','AVAILABLE',  now()),
  ('d1d1d1d1-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000003','MAYBE',      now()),
  ('d1d1d1d1-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000004','AVAILABLE',  now())
on conflict (check_id, user_id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 6: Notifications for new team captains
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.notifications (user_id, type, title, body, team_id, is_read) values
  ('cc000000-0000-0000-0000-000000000001','availability_check','Availability check sent',
   'You sent an availability check to Chennai Challengers CC for Sunday.',
   'cccccccc-0000-0000-0000-000000000002', true),
  ('dd000000-0000-0000-0000-000000000001','availability_check','Availability check sent',
   'You sent an availability check to Velachery Royals CC for Monday.',
   'dddddddd-0000-0000-0000-000000000002', true);

-- ─────────────────────────────────────────────────────────────────────────────
-- FINAL REPORT
-- ─────────────────────────────────────────────────────────────────────────────
select
  t.name                                                          as team,
  u.display_name                                                  as captain,
  t.invite_code,
  count(m.id)                                                     as members
from public.teams t
join public.users u on u.id = t.captain_id
left join public.memberships m on m.team_id = t.id and m.is_active = true
group by t.id, t.name, u.display_name, t.invite_code
order by t.name;
