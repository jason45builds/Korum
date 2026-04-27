-- ═══════════════════════════════════════════════════════════════════════════
-- KORUM STRESS TEST SEED v4  (final, audit-corrected)
-- Requires: migration 019_audit_corrections.sql already applied
--           (payments.receipt is now nullable with default)
-- Run in: Supabase SQL Editor — service_role context bypasses RLS
-- ═══════════════════════════════════════════════════════════════════════════

-- ── STEP 0: Clean previous seed data (safe to re-run) ─────────────────────
do $$
declare
  v_ids uuid[] := array[
    'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000006',
    'a0000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-000000000008',
    'a0000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-000000000010',
    'a0000000-0000-0000-0000-000000000011',
    'b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000005','b0000000-0000-0000-0000-000000000006',
    'b0000000-0000-0000-0000-000000000007','b0000000-0000-0000-0000-000000000008',
    'b0000000-0000-0000-0000-000000000009','b0000000-0000-0000-0000-000000000010',
    'b0000000-0000-0000-0000-000000000011'
  ];
begin
  delete from public.motm_votes              where match_id   = 'cccccccc-0000-0000-0000-000000000001';
  delete from public.match_attendance        where match_id   = 'cccccccc-0000-0000-0000-000000000001';
  delete from public.strategy_notes         where match_id   = 'cccccccc-0000-0000-0000-000000000001';
  delete from public.notifications          where match_id   = 'cccccccc-0000-0000-0000-000000000001';
  delete from public.procurement_contributions where item_id in (
    'f1f1f1f1-0000-0000-0000-000000000001',
    'f2f2f2f2-0000-0000-0000-000000000002',
    'f3f3f3f3-0000-0000-0000-000000000003');
  delete from public.procurement_votes       where item_id in (
    'f1f1f1f1-0000-0000-0000-000000000001',
    'f2f2f2f2-0000-0000-0000-000000000002',
    'f3f3f3f3-0000-0000-0000-000000000003');
  delete from public.procurement_items       where list_id   = 'ffffffff-0000-0000-0000-000000000001';
  delete from public.procurement_lists       where id        = 'ffffffff-0000-0000-0000-000000000001';
  delete from public.payments                where match_id  = 'cccccccc-0000-0000-0000-000000000001';
  delete from public.match_participants      where match_id  = 'cccccccc-0000-0000-0000-000000000001';
  delete from public.matches                 where id        = 'cccccccc-0000-0000-0000-000000000001';
  delete from public.vendor_products         where vendor_id = 'dddddddd-0000-0000-0000-000000000001';
  delete from public.vendors                 where id        = 'dddddddd-0000-0000-0000-000000000001';
  delete from public.availability_responses  where check_id  = 'a1a1a1a1-0000-0000-0000-000000000001';
  delete from public.availability_checks     where id        = 'a1a1a1a1-0000-0000-0000-000000000001';
  delete from public.memberships             where team_id in (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000001');
  delete from public.teams  where slug in ('seed-desert-wings-cc','seed-marina-strikers-cc');
  delete from public.users  where id = any(v_ids);
  delete from auth.users    where id = any(v_ids);
end $$;

-- ── STEP 1: auth.users → trigger auto-creates public.users ────────────────
-- Password hash is bcrypt for "Korum@2026" — never used, seed accounts only
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
  -- Team A: Desert Wings CC (captain = Arjun)
  ('a0000000-0000-0000-0000-000000000001','seed_cap_a@korum.test', '{"full_name":"Arjun Kapoor",   "display_name":"Arjun",   "phone":"seed-cap-a","default_sport":"Cricket","city":"Chennai"}'),
  ('a0000000-0000-0000-0000-000000000002','seed_p_a02@korum.test', '{"full_name":"Vikram Sharma",  "display_name":"Vikram",  "phone":"seed-p-a02","default_sport":"Cricket","city":"Chennai"}'),
  ('a0000000-0000-0000-0000-000000000003','seed_p_a03@korum.test', '{"full_name":"Rahul Mehta",    "display_name":"Rahul",   "phone":"seed-p-a03","default_sport":"Cricket","city":"Chennai"}'),
  ('a0000000-0000-0000-0000-000000000004','seed_p_a04@korum.test', '{"full_name":"Priya Nair",     "display_name":"Priya",   "phone":"seed-p-a04","default_sport":"Cricket","city":"Chennai"}'),
  ('a0000000-0000-0000-0000-000000000005','seed_p_a05@korum.test', '{"full_name":"Karthik Rajan",  "display_name":"Karthik", "phone":"seed-p-a05","default_sport":"Cricket","city":"Chennai"}'),
  ('a0000000-0000-0000-0000-000000000006','seed_p_a06@korum.test', '{"full_name":"Sneha Pillai",   "display_name":"Sneha",   "phone":"seed-p-a06","default_sport":"Cricket","city":"Chennai"}'),
  ('a0000000-0000-0000-0000-000000000007','seed_p_a07@korum.test', '{"full_name":"Dev Anand",      "display_name":"Dev",     "phone":"seed-p-a07","default_sport":"Cricket","city":"Chennai"}'),
  ('a0000000-0000-0000-0000-000000000008','seed_p_a08@korum.test', '{"full_name":"Meera Krishnan", "display_name":"Meera",   "phone":"seed-p-a08","default_sport":"Cricket","city":"Chennai"}'),
  ('a0000000-0000-0000-0000-000000000009','seed_p_a09@korum.test', '{"full_name":"Ravi Sundaram",  "display_name":"Ravi",    "phone":"seed-p-a09","default_sport":"Cricket","city":"Chennai"}'),
  ('a0000000-0000-0000-0000-000000000010','seed_p_a10@korum.test', '{"full_name":"Ananya Iyer",    "display_name":"Ananya",  "phone":"seed-p-a10","default_sport":"Cricket","city":"Chennai"}'),
  ('a0000000-0000-0000-0000-000000000011','seed_p_a11@korum.test', '{"full_name":"Siva Kumar",     "display_name":"Siva",    "phone":"seed-p-a11","default_sport":"Cricket","city":"Chennai"}'),
  -- Team B: Marina Strikers CC (captain = Deepa)
  ('b0000000-0000-0000-0000-000000000001','seed_cap_b@korum.test', '{"full_name":"Deepa Venkat",   "display_name":"Deepa",   "phone":"seed-cap-b","default_sport":"Cricket","city":"Chennai"}'),
  ('b0000000-0000-0000-0000-000000000002','seed_p_b02@korum.test', '{"full_name":"Naveen Balaji",  "display_name":"Naveen",  "phone":"seed-p-b02","default_sport":"Cricket","city":"Chennai"}'),
  ('b0000000-0000-0000-0000-000000000003','seed_p_b03@korum.test', '{"full_name":"Lakshmi Devi",   "display_name":"Lakshmi", "phone":"seed-p-b03","default_sport":"Cricket","city":"Chennai"}'),
  ('b0000000-0000-0000-0000-000000000004','seed_p_b04@korum.test', '{"full_name":"Suresh Babu",    "display_name":"Suresh",  "phone":"seed-p-b04","default_sport":"Cricket","city":"Chennai"}'),
  ('b0000000-0000-0000-0000-000000000005','seed_p_b05@korum.test', '{"full_name":"Kavya Menon",    "display_name":"Kavya",   "phone":"seed-p-b05","default_sport":"Cricket","city":"Chennai"}'),
  ('b0000000-0000-0000-0000-000000000006','seed_p_b06@korum.test', '{"full_name":"Ajay Thomas",    "display_name":"Ajay",    "phone":"seed-p-b06","default_sport":"Cricket","city":"Chennai"}'),
  ('b0000000-0000-0000-0000-000000000007','seed_p_b07@korum.test', '{"full_name":"Nisha Pillai",   "display_name":"Nisha",   "phone":"seed-p-b07","default_sport":"Cricket","city":"Chennai"}'),
  ('b0000000-0000-0000-0000-000000000008','seed_p_b08@korum.test', '{"full_name":"Gopal Krishna",  "display_name":"Gopal",   "phone":"seed-p-b08","default_sport":"Cricket","city":"Chennai"}'),
  ('b0000000-0000-0000-0000-000000000009','seed_p_b09@korum.test', '{"full_name":"Divya Sharma",   "display_name":"Divya",   "phone":"seed-p-b09","default_sport":"Cricket","city":"Chennai"}'),
  ('b0000000-0000-0000-0000-000000000010','seed_p_b10@korum.test', '{"full_name":"Mohan Das",      "display_name":"Mohan",   "phone":"seed-p-b10","default_sport":"Cricket","city":"Chennai"}'),
  ('b0000000-0000-0000-0000-000000000011','seed_p_b11@korum.test', '{"full_name":"Padma Rani",     "display_name":"Padma",   "phone":"seed-p-b11","default_sport":"Cricket","city":"Chennai"}')
) as t(id, email, meta)
on conflict (id) do nothing;

-- ── STEP 2: Patch public.users with realistic reliability scores ───────────
-- (trigger already created the rows; we just update scores and roles)
update public.users set reliability_score = 98, role = 'captain' where id = 'a0000000-0000-0000-0000-000000000001';
update public.users set reliability_score = 95 where id = 'a0000000-0000-0000-0000-000000000002';
update public.users set reliability_score = 90 where id = 'a0000000-0000-0000-0000-000000000003';
update public.users set reliability_score = 88 where id = 'a0000000-0000-0000-0000-000000000004';
update public.users set reliability_score = 75 where id = 'a0000000-0000-0000-0000-000000000005';
update public.users set reliability_score = 92 where id = 'a0000000-0000-0000-0000-000000000006';
update public.users set reliability_score = 85 where id = 'a0000000-0000-0000-0000-000000000007';
update public.users set reliability_score = 70 where id = 'a0000000-0000-0000-0000-000000000008';
update public.users set reliability_score = 88 where id = 'a0000000-0000-0000-0000-000000000009';
update public.users set reliability_score = 60 where id = 'a0000000-0000-0000-0000-000000000010';
update public.users set reliability_score = 80 where id = 'a0000000-0000-0000-0000-000000000011';
update public.users set reliability_score = 96, role = 'captain' where id = 'b0000000-0000-0000-0000-000000000001';
update public.users set reliability_score = 82 where id = 'b0000000-0000-0000-0000-000000000002';
update public.users set reliability_score = 91 where id = 'b0000000-0000-0000-0000-000000000003';
update public.users set reliability_score = 77 where id = 'b0000000-0000-0000-0000-000000000004';
update public.users set reliability_score = 89 where id = 'b0000000-0000-0000-0000-000000000005';
update public.users set reliability_score = 73 where id = 'b0000000-0000-0000-0000-000000000006';
update public.users set reliability_score = 94 where id = 'b0000000-0000-0000-0000-000000000007';
update public.users set reliability_score = 65 where id = 'b0000000-0000-0000-0000-000000000008';
update public.users set reliability_score = 87 where id = 'b0000000-0000-0000-0000-000000000009';
update public.users set reliability_score = 79 where id = 'b0000000-0000-0000-0000-000000000010';
update public.users set reliability_score = 84 where id = 'b0000000-0000-0000-0000-000000000011';

-- ── STEP 3: Teams ──────────────────────────────────────────────────────────
insert into public.teams (id, name, slug, sport, city, captain_id, invite_code) values
  ('aaaaaaaa-0000-0000-0000-000000000001',
   'Desert Wings CC', 'seed-desert-wings-cc', 'Cricket', 'Chennai',
   'a0000000-0000-0000-0000-000000000001', 'WINGSCC1'),
  ('bbbbbbbb-0000-0000-0000-000000000001',
   'Marina Strikers CC', 'seed-marina-strikers-cc', 'Cricket', 'Chennai',
   'b0000000-0000-0000-0000-000000000001', 'MARINCC1')
on conflict (slug) do nothing;

-- ── STEP 4: Memberships ────────────────────────────────────────────────────
insert into public.memberships (user_id, team_id, role, is_active) values
  -- Desert Wings CC
  ('a0000000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','CAPTAIN',true),
  ('a0000000-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','PLAYER', true),
  ('a0000000-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001','PLAYER', true),
  ('a0000000-0000-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000001','PLAYER', true),
  ('a0000000-0000-0000-0000-000000000005','aaaaaaaa-0000-0000-0000-000000000001','PLAYER', true),
  ('a0000000-0000-0000-0000-000000000006','aaaaaaaa-0000-0000-0000-000000000001','PLAYER', true),
  ('a0000000-0000-0000-0000-000000000007','aaaaaaaa-0000-0000-0000-000000000001','PLAYER', true),
  ('a0000000-0000-0000-0000-000000000008','aaaaaaaa-0000-0000-0000-000000000001','PLAYER', true),
  ('a0000000-0000-0000-0000-000000000009','aaaaaaaa-0000-0000-0000-000000000001','PLAYER', true),
  ('a0000000-0000-0000-0000-000000000010','aaaaaaaa-0000-0000-0000-000000000001','PLAYER', true),
  ('a0000000-0000-0000-0000-000000000011','aaaaaaaa-0000-0000-0000-000000000001','PLAYER', true),
  -- Marina Strikers CC
  ('b0000000-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001','CAPTAIN',true),
  ('b0000000-0000-0000-0000-000000000002','bbbbbbbb-0000-0000-0000-000000000001','PLAYER', true),
  ('b0000000-0000-0000-0000-000000000003','bbbbbbbb-0000-0000-0000-000000000001','PLAYER', true),
  ('b0000000-0000-0000-0000-000000000004','bbbbbbbb-0000-0000-0000-000000000001','PLAYER', true),
  ('b0000000-0000-0000-0000-000000000005','bbbbbbbb-0000-0000-0000-000000000001','PLAYER', true),
  ('b0000000-0000-0000-0000-000000000006','bbbbbbbb-0000-0000-0000-000000000001','PLAYER', true),
  ('b0000000-0000-0000-0000-000000000007','bbbbbbbb-0000-0000-0000-000000000001','PLAYER', true),
  ('b0000000-0000-0000-0000-000000000008','bbbbbbbb-0000-0000-0000-000000000001','PLAYER', true),
  ('b0000000-0000-0000-0000-000000000009','bbbbbbbb-0000-0000-0000-000000000001','PLAYER', true),
  ('b0000000-0000-0000-0000-000000000010','bbbbbbbb-0000-0000-0000-000000000001','PLAYER', true),
  ('b0000000-0000-0000-0000-000000000011','bbbbbbbb-0000-0000-0000-000000000001','PLAYER', true)
on conflict (user_id, team_id) do nothing;

-- ── STEP 5: Match (LOCKED — all 11 confirmed, fees collected) ─────────────
insert into public.matches (
  id, team_id, captain_id, title, sport,
  venue_name, venue_address,
  starts_at, payment_due_at, lock_at,
  squad_size, price_per_player, status, visibility, join_code, locked_at
) values (
  'cccccccc-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Desert Wings CC vs Marina Strikers CC — T20',
  'Cricket',
  'MA Chidambaram Stadium Annex, Chennai',
  'Chepauk, Chennai, Tamil Nadu 600005',
  now() + interval '2 days',
  now() + interval '2 days' - interval '3 hours',
  now() + interval '2 days' - interval '1 hour',
  11, 250.00, 'LOCKED', 'PUBLIC', 'SEEDMTCH1',
  now() - interval '6 hours'
) on conflict (id) do nothing;

-- ── STEP 6: All 11 participants — LOCKED + PAID ────────────────────────────
-- Capacity trigger fires but squad_size = 11 exactly, so this fits cleanly
insert into public.match_participants (match_id, user_id, status, payment_status, joined_at) values
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','LOCKED','PAID',now()-interval'24h'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','LOCKED','PAID',now()-interval'23h'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003','LOCKED','PAID',now()-interval'22h'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000004','LOCKED','PAID',now()-interval'21h'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000005','LOCKED','PAID',now()-interval'20h'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000006','LOCKED','PAID',now()-interval'19h'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000007','LOCKED','PAID',now()-interval'18h'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000008','LOCKED','PAID',now()-interval'17h'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000009','LOCKED','PAID',now()-interval'16h'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000010','LOCKED','PAID',now()-interval'15h'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000011','LOCKED','PAID',now()-interval'14h')
on conflict (match_id, user_id) do nothing;

-- ── STEP 7: Payments — receipt column now nullable (migration 019 applied) ─
insert into public.payments (match_id, user_id, amount, currency, status, receipt, paid_at) values
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001',250,'INR','PAID','seed-rcpt-a01',now()-interval'24h'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',250,'INR','PAID','seed-rcpt-a02',now()-interval'23h'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003',250,'INR','PAID','seed-rcpt-a03',now()-interval'22h'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000004',250,'INR','PAID','seed-rcpt-a04',now()-interval'21h'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000005',250,'INR','PAID','seed-rcpt-a05',now()-interval'20h'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000006',250,'INR','PAID','seed-rcpt-a06',now()-interval'19h'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000007',250,'INR','PAID','seed-rcpt-a07',now()-interval'18h'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000008',250,'INR','PAID','seed-rcpt-a08',now()-interval'17h'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000009',250,'INR','PAID','seed-rcpt-a09',now()-interval'16h'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000010',250,'INR','PAID','seed-rcpt-a10',now()-interval'15h'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000011',250,'INR','PAID','seed-rcpt-a11',now()-interval'14h')
on conflict (match_id, user_id) do nothing;

-- ── STEP 8: Strategy notes (no unique constraint — guarded with NOT EXISTS) ─
insert into public.strategy_notes (match_id, author_id, content, is_pinned)
select v.match_id, v.author_id, v.content, v.is_pinned
from (values
  ('cccccccc-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid,
   'BATTING ORDER: Arjun (1) ● Vikram (2) ● Rahul (3) ● Priya (4) ● Karthik (5) ● Sneha (6) ● Dev (7) ● Meera (8) ● Ravi (9) ● Ananya (10) ● Siva (11)',
   true),
  ('cccccccc-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid,
   'BOWLING PLAN: Siva Kumar opens with swing. Ravi first change. Dev + Karthik share spin duties. Target: restrict under 140.',
   false),
  ('cccccccc-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000006'::uuid,
   'FIELD SET: Extra cover, mid-wicket, deep square leg for their openers. Their No.4 likes to pull — fine leg in position.',
   false)
) as v(match_id, author_id, content, is_pinned)
where not exists (
  select 1 from public.strategy_notes where match_id = 'cccccccc-0000-0000-0000-000000000001'
);

-- ── STEP 9: Attendance — 9 attended, 2 no-shows ───────────────────────────
-- Triggers recompute_reliability for each player automatically
insert into public.match_attendance (match_id, user_id, status, recorded_by) values
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','ATTENDED',  'a0000000-0000-0000-0000-000000000001'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','ATTENDED',  'a0000000-0000-0000-0000-000000000001'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003','ATTENDED',  'a0000000-0000-0000-0000-000000000001'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000004','ATTENDED',  'a0000000-0000-0000-0000-000000000001'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000005','ATTENDED',  'a0000000-0000-0000-0000-000000000001'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000006','ATTENDED',  'a0000000-0000-0000-0000-000000000001'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000007','ATTENDED',  'a0000000-0000-0000-0000-000000000001'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000008','ATTENDED',  'a0000000-0000-0000-0000-000000000001'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000009','ATTENDED',  'a0000000-0000-0000-0000-000000000001'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000010','NO_SHOW',   'a0000000-0000-0000-0000-000000000001'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000011','NO_SHOW',   'a0000000-0000-0000-0000-000000000001')
on conflict (match_id, user_id) do nothing;

-- ── STEP 10: MOTM votes (Vikram wins 4-2-2) ──────────────────────────────
insert into public.motm_votes (match_id, voter_id, nominee_id) values
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000002'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000002'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000002'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000006'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-000000000003'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000003'),
  ('cccccccc-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-000000000002')
on conflict (match_id, voter_id) do nothing;

-- ── STEP 11: Vendor (SportZone Chennai) ───────────────────────────────────
insert into public.vendors (
  id, owner_id, name, category, description, city,
  lat, lng, contact_phone, contact_email, price_note,
  sports, is_verified, is_active, gst_number
) values (
  'dddddddd-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'SEED: SportZone Chennai', 'Kit',
  'Premium cricket and sports kit. Custom jerseys, equipment, gear. 48hr delivery guaranteed.',
  'Chennai', 13.0827, 80.2707,
  '+919876543210', 'sportzone@example.com',
  'From Rs.350/jersey, bulk discounts available',
  array['Cricket','Football','Hockey'],
  true, true, '33AABCS1429B1ZX'
) on conflict (id) do nothing;

-- ── STEP 12: Vendor products ──────────────────────────────────────────────
insert into public.vendor_products (id, vendor_id, name, description, category, price, unit, min_qty, stock, sport_tags, image_urls, is_active) values
  ('eeeeeeee-0000-0000-0000-000000000001','dddddddd-0000-0000-0000-000000000001',
   'Custom Cricket Jersey (sublimation)',
   'Full-sublimation polyester. Team name, player numbers, sponsor logo. All sizes. 5-day bulk delivery.',
   'Kit', 450.00, 'item', 11, 200, array['Cricket'], '{}', true),
  ('eeeeeeee-0000-0000-0000-000000000002','dddddddd-0000-0000-0000-000000000001',
   'SG Club Cricket Ball (red, pack of 6)',
   'Official weight and seam. 1-year warranty.',
   'Equipment', 1800.00, 'set', 1, 50, array['Cricket'], '{}', true),
  ('eeeeeeee-0000-0000-0000-000000000003','dddddddd-0000-0000-0000-000000000001',
   'Match Day Hydration Pack (team of 11)',
   'Energy drinks, water, electrolyte sachets. Ice-packed delivery to ground.',
   'Food', 850.00, 'set', 1, 30, array['Cricket','Football'], '{}', true),
  ('eeeeeeee-0000-0000-0000-000000000004','dddddddd-0000-0000-0000-000000000001',
   'Cricket Ground Marking Kit',
   'Boundary rope 75m, crease whitener, 3x stumps, bails. Complete setup kit.',
   'Equipment', 2200.00, 'set', 1, 15, array['Cricket'], '{}', true)
on conflict (id) do nothing;

-- ── STEP 13: Procurement list ─────────────────────────────────────────────
insert into public.procurement_lists (id, team_id, title, created_by, status) values
  ('ffffffff-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'Match Day Kit & Supplies — Desert Wings CC',
   'a0000000-0000-0000-0000-000000000001', 'OPEN')
on conflict (id) do nothing;

-- Items — partially funded: jerseys at 71%, balls fully funded, hydration at 47%
insert into public.procurement_items (id, list_id, vendor_id, product_id, name, estimated_cost, target_amount, collected_amount, created_by, quantity, unit_price) values
  ('f1f1f1f1-0000-0000-0000-000000000001',
   'ffffffff-0000-0000-0000-000000000001',
   'dddddddd-0000-0000-0000-000000000001',
   'eeeeeeee-0000-0000-0000-000000000001',
   'Custom jerseys ×11', 4950.00, 4950.00, 0, 'a0000000-0000-0000-0000-000000000001', 11, 450.00),
  ('f2f2f2f2-0000-0000-0000-000000000002',
   'ffffffff-0000-0000-0000-000000000001',
   'dddddddd-0000-0000-0000-000000000001',
   'eeeeeeee-0000-0000-0000-000000000002',
   'SG Club Balls (6-pack)', 1800.00, 1800.00, 0, 'a0000000-0000-0000-0000-000000000001', 1, 1800.00),
  ('f3f3f3f3-0000-0000-0000-000000000003',
   'ffffffff-0000-0000-0000-000000000001',
   'dddddddd-0000-0000-0000-000000000001',
   'eeeeeeee-0000-0000-0000-000000000003',
   'Match Day Hydration Pack', 850.00, 850.00, 0, 'a0000000-0000-0000-0000-000000000001', 1, 850.00)
on conflict (id) do nothing;

-- Procurement votes
insert into public.procurement_votes (item_id, user_id, vote) values
  ('f1f1f1f1-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','NEEDED'),
  ('f1f1f1f1-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','NEEDED'),
  ('f1f1f1f1-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003','NEEDED'),
  ('f1f1f1f1-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000004','NEEDED'),
  ('f1f1f1f1-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000005','NEEDED'),
  ('f1f1f1f1-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000006','NEEDED'),
  ('f1f1f1f1-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000007','NEEDED'),
  ('f1f1f1f1-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000008','NEEDED'),
  ('f1f1f1f1-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000009','NEEDED'),
  ('f1f1f1f1-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000010','NOT_NEEDED'),
  ('f1f1f1f1-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000011','NOT_NEEDED'),
  ('f2f2f2f2-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001','NEEDED'),
  ('f2f2f2f2-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000002','NEEDED'),
  ('f2f2f2f2-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000003','NEEDED'),
  ('f2f2f2f2-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000004','NEEDED'),
  ('f2f2f2f2-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000005','NEEDED'),
  ('f3f3f3f3-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000001','NEEDED'),
  ('f3f3f3f3-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000002','NEEDED'),
  ('f3f3f3f3-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000003','NEEDED'),
  ('f3f3f3f3-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000004','NOT_NEEDED'),
  ('f3f3f3f3-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000005','NOT_NEEDED')
on conflict (item_id, user_id) do nothing;

-- Contributions (pooled money)
insert into public.procurement_contributions (item_id, user_id, amount, note) values
  -- Jerseys: 8 players chip in, Rs.3,500 of Rs.4,950 collected
  ('f1f1f1f1-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001',500,'Captain contribution'),
  ('f1f1f1f1-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',450,null),
  ('f1f1f1f1-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003',450,null),
  ('f1f1f1f1-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000004',450,null),
  ('f1f1f1f1-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000005',450,null),
  ('f1f1f1f1-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000006',450,null),
  ('f1f1f1f1-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000007',350,'Will pay rest at ground'),
  ('f1f1f1f1-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000008',400,null),
  -- Balls: fully funded Rs.1,800
  ('f2f2f2f2-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001',600,'Captain covers 1/3'),
  ('f2f2f2f2-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000002',600,null),
  ('f2f2f2f2-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000003',600,null),
  -- Hydration: Rs.400 of Rs.850 collected
  ('f3f3f3f3-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000001',200,null),
  ('f3f3f3f3-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000002',200,null);

-- Sync collected_amount on items from contributions (since increment_collected isn't called here)
update public.procurement_items set collected_amount = (
  select coalesce(sum(amount), 0) from public.procurement_contributions
  where item_id = 'f1f1f1f1-0000-0000-0000-000000000001'
) where id = 'f1f1f1f1-0000-0000-0000-000000000001';

update public.procurement_items set collected_amount = (
  select coalesce(sum(amount), 0) from public.procurement_contributions
  where item_id = 'f2f2f2f2-0000-0000-0000-000000000002'
) where id = 'f2f2f2f2-0000-0000-0000-000000000002';

update public.procurement_items set collected_amount = (
  select coalesce(sum(amount), 0) from public.procurement_contributions
  where item_id = 'f3f3f3f3-0000-0000-0000-000000000003'
) where id = 'f3f3f3f3-0000-0000-0000-000000000003';

-- ── STEP 14: Availability check for next match ────────────────────────────
insert into public.availability_checks (
  id, team_id, captain_id, match_date, match_time, venue_hint, note, expires_at
) values (
  'a1a1a1a1-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  (now() + interval '7 days')::date,
  '07:00',
  'MA Chidambaram Annex, Chennai',
  'Next league fixture. Need full 11 confirmed. Mark ASAP!',
  now() + interval '5 days'
) on conflict (id) do nothing;

insert into public.availability_responses (check_id, user_id, response, responded_at) values
  ('a1a1a1a1-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','AVAILABLE',   now()),
  ('a1a1a1a1-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','AVAILABLE',   now()),
  ('a1a1a1a1-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003','AVAILABLE',   now()),
  ('a1a1a1a1-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000004','MAYBE',       now()),
  ('a1a1a1a1-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000005','UNAVAILABLE', now()),
  ('a1a1a1a1-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000006','AVAILABLE',   now()),
  ('a1a1a1a1-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000007','AVAILABLE',   now())
on conflict (check_id, user_id) do nothing;

-- ── STEP 15: Notifications ────────────────────────────────────────────────
insert into public.notifications (user_id, type, title, body, match_id, team_id, is_read) values
  -- Payment confirmations (all 11 players)
  ('a0000000-0000-0000-0000-000000000001','payment_claimed','Payment received','Your payment of ₹250 for Desert Wings vs Marina Strikers has been confirmed.','cccccccc-0000-0000-0000-000000000001',null,true),
  ('a0000000-0000-0000-0000-000000000002','payment_claimed','Payment received','Your payment of ₹250 for Desert Wings vs Marina Strikers has been confirmed.','cccccccc-0000-0000-0000-000000000001',null,true),
  ('a0000000-0000-0000-0000-000000000003','payment_claimed','Payment received','Your payment of ₹250 has been confirmed.','cccccccc-0000-0000-0000-000000000001',null,false),
  -- Match locked notification
  ('a0000000-0000-0000-0000-000000000001','match_locked','Squad locked!','All 11 players confirmed. Desert Wings CC is READY for tomorrow.','cccccccc-0000-0000-0000-000000000001',null,false),
  ('a0000000-0000-0000-0000-000000000002','match_locked','Squad locked!','All 11 confirmed. See you at Chepauk tomorrow at 7AM.','cccccccc-0000-0000-0000-000000000001',null,false),
  -- Availability check pings
  ('a0000000-0000-0000-0000-000000000004','availability_check','Available next week?','Arjun wants to know if you can play on Sunday. Tap to respond.',null,'aaaaaaaa-0000-0000-0000-000000000001',false),
  ('a0000000-0000-0000-0000-000000000005','availability_check','Available next week?','Arjun wants to know if you can play on Sunday. Tap to respond.',null,'aaaaaaaa-0000-0000-0000-000000000001',false),
  ('a0000000-0000-0000-0000-000000000008','availability_check','Available next week?','Arjun wants to know if you can play on Sunday. Tap to respond.',null,'aaaaaaaa-0000-0000-0000-000000000001',false),
  -- Match reminder
  ('a0000000-0000-0000-0000-000000000001','match_reminder','Match tomorrow 7AM','Desert Wings CC vs Marina Strikers — MA Chidambaram Annex. Arrive 30 min early.','cccccccc-0000-0000-0000-000000000001',null,false);

-- ── FINAL REPORT ──────────────────────────────────────────────────────────
select
  'SEED COMPLETE ✓' as status,
  (select count(*) from auth.users          where email like '%@korum.test')             as auth_users,
  (select count(*) from public.users        where phone like 'seed-%')                   as public_users,
  (select count(*) from public.teams        where slug  like 'seed-%')                   as teams,
  (select count(*) from public.memberships  where team_id = 'aaaaaaaa-0000-0000-0000-000000000001') as team_a_size,
  (select count(*) from public.memberships  where team_id = 'bbbbbbbb-0000-0000-0000-000000000001') as team_b_size,
  (select count(*) from public.match_participants where match_id = 'cccccccc-0000-0000-0000-000000000001') as participants,
  (select count(*) from public.payments     where match_id = 'cccccccc-0000-0000-0000-000000000001') as payments,
  (select sum(amount) from public.payments  where match_id = 'cccccccc-0000-0000-0000-000000000001') as match_fees_inr,
  (select count(*) from public.match_attendance where match_id = 'cccccccc-0000-0000-0000-000000000001') as attendance_records,
  (select count(*) filter (where status = 'ATTENDED') from public.match_attendance where match_id = 'cccccccc-0000-0000-0000-000000000001') as attended,
  (select count(*) filter (where status = 'NO_SHOW')  from public.match_attendance where match_id = 'cccccccc-0000-0000-0000-000000000001') as no_shows,
  (select count(*) from public.motm_votes   where match_id = 'cccccccc-0000-0000-0000-000000000001') as motm_votes,
  (select u.display_name from public.motm_votes mv join public.users u on u.id = mv.nominee_id
   where mv.match_id = 'cccccccc-0000-0000-0000-000000000001'
   group by mv.nominee_id, u.display_name order by count(*) desc limit 1)                as motm_winner,
  (select count(*) from public.vendor_products where vendor_id = 'dddddddd-0000-0000-0000-000000000001') as vendor_products,
  (select sum(pc.amount) from public.procurement_contributions pc
   join public.procurement_items pi on pi.id = pc.item_id
   where pi.list_id = 'ffffffff-0000-0000-0000-000000000001')                             as total_pooled_inr,
  (select count(*) from public.notifications where match_id = 'cccccccc-0000-0000-0000-000000000001'
   or team_id = 'aaaaaaaa-0000-0000-0000-000000000001')                                  as notifications_sent;
