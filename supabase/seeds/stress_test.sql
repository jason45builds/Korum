-- ═══════════════════════════════════════════════════════════════════════════
-- KORUM STRESS TEST SEED
-- Paste this entire script into Supabase SQL Editor and run it.
-- Creates: 2 captains + 22 players, 2 teams, 1 cricket match, 1 vendor,
--          4 products, 1 procurement list with votes + contributions,
--          match participants, payments, attendance, MOTM votes.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── STEP 0: Clean up any previous seed data ────────────────────────────────
do $$
declare
  v_team_a   uuid;
  v_team_b   uuid;
begin
  select id into v_team_a from public.teams where slug = 'seed-desert-wings-cc';
  select id into v_team_b from public.teams where slug = 'seed-marina-strikers-cc';

  if v_team_a is not null then
    delete from public.procurement_lists where team_id in (v_team_a, v_team_b);
    delete from public.matches where team_id in (v_team_a, v_team_b);
    delete from public.memberships where team_id in (v_team_a, v_team_b);
    delete from public.teams where id in (v_team_a, v_team_b);
  end if;
  delete from public.vendors where name = 'SEED: SportZone Chennai';
  delete from public.users where phone like 'seed-%';
end $$;

-- ── STEP 1: Create 24 fake users (bypass auth — direct insert) ────────────
-- Note: These are pure DB users without auth.users entries.
-- We use service_role so RLS is bypassed.

insert into public.users (id, phone, full_name, display_name, default_sport, city, role, reliability_score)
values
  -- Team A: Desert Wings CC — Captain + 10 players
  ('a0000000-0000-0000-0000-000000000001', 'seed-cap-a', 'Arjun Kapoor',    'Arjun K',    'Cricket', 'Chennai', 'captain', 98),
  ('a0000000-0000-0000-0000-000000000002', 'seed-p-a02', 'Vikram Sharma',   'Vikram S',   'Cricket', 'Chennai', 'player',  95),
  ('a0000000-0000-0000-0000-000000000003', 'seed-p-a03', 'Rahul Mehta',     'Rahul M',    'Cricket', 'Chennai', 'player',  90),
  ('a0000000-0000-0000-0000-000000000004', 'seed-p-a04', 'Priya Nair',      'Priya N',    'Cricket', 'Chennai', 'player',  88),
  ('a0000000-0000-0000-0000-000000000005', 'seed-p-a05', 'Karthik Rajan',   'Karthik R',  'Cricket', 'Chennai', 'player',  75),
  ('a0000000-0000-0000-0000-000000000006', 'seed-p-a06', 'Sneha Pillai',    'Sneha P',    'Cricket', 'Chennai', 'player',  92),
  ('a0000000-0000-0000-0000-000000000007', 'seed-p-a07', 'Dev Anand',       'Dev A',      'Cricket', 'Chennai', 'player',  85),
  ('a0000000-0000-0000-0000-000000000008', 'seed-p-a08', 'Meera Krishnan',  'Meera K',    'Cricket', 'Chennai', 'player',  70),
  ('a0000000-0000-0000-0000-000000000009', 'seed-p-a09', 'Ravi Sundaram',   'Ravi S',     'Cricket', 'Chennai', 'player',  88),
  ('a0000000-0000-0000-0000-000000000010', 'seed-p-a10', 'Ananya Iyer',     'Ananya I',   'Cricket', 'Chennai', 'player',  60),
  ('a0000000-0000-0000-0000-000000000011', 'seed-p-a11', 'Siva Kumar',      'Siva K',     'Cricket', 'Chennai', 'player',  80),
  -- Team B: Marina Strikers CC — Captain + 10 players
  ('b0000000-0000-0000-0000-000000000001', 'seed-cap-b', 'Deepa Venkat',    'Deepa V',    'Cricket', 'Chennai', 'captain', 96),
  ('b0000000-0000-0000-0000-000000000002', 'seed-p-b02', 'Naveen Balaji',   'Naveen B',   'Cricket', 'Chennai', 'player',  82),
  ('b0000000-0000-0000-0000-000000000003', 'seed-p-b03', 'Lakshmi Devi',    'Lakshmi D',  'Cricket', 'Chennai', 'player',  91),
  ('b0000000-0000-0000-0000-000000000004', 'seed-p-b04', 'Suresh Babu',     'Suresh B',   'Cricket', 'Chennai', 'player',  77),
  ('b0000000-0000-0000-0000-000000000005', 'seed-p-b05', 'Kavya Menon',     'Kavya M',    'Cricket', 'Chennai', 'player',  89),
  ('b0000000-0000-0000-0000-000000000006', 'seed-p-b06', 'Ajay Thomas',     'Ajay T',     'Cricket', 'Chennai', 'player',  73),
  ('b0000000-0000-0000-0000-000000000007', 'seed-p-b07', 'Nisha Pillai',    'Nisha P',    'Cricket', 'Chennai', 'player',  94),
  ('b0000000-0000-0000-0000-000000000008', 'seed-p-b08', 'Gopal Krishna',   'Gopal K',    'Cricket', 'Chennai', 'player',  65),
  ('b0000000-0000-0000-0000-000000000009', 'seed-p-b09', 'Divya Sharma',    'Divya S',    'Cricket', 'Chennai', 'player',  87),
  ('b0000000-0000-0000-0000-000000000010', 'seed-p-b10', 'Mohan Das',       'Mohan D',    'Cricket', 'Chennai', 'player',  79),
  ('b0000000-0000-0000-0000-000000000011', 'seed-p-b11', 'Padma Rani',      'Padma R',    'Cricket', 'Chennai', 'player',  84)
on conflict (phone) do update
  set full_name = excluded.full_name, display_name = excluded.display_name, updated_at = now();

-- ── STEP 2: Create 2 Teams ─────────────────────────────────────────────────
insert into public.teams (id, name, slug, sport, city, captain_id, invite_code)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Desert Wings CC',     'seed-desert-wings-cc',    'Cricket', 'Chennai', 'a0000000-0000-0000-0000-000000000001', 'WINGSCC1'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Marina Strikers CC',  'seed-marina-strikers-cc', 'Cricket', 'Chennai', 'b0000000-0000-0000-0000-000000000001', 'MARINCC1')
on conflict (slug) do nothing;

-- ── STEP 3: Add members to teams ──────────────────────────────────────────
insert into public.memberships (user_id, team_id, role, is_active)
values
  -- Desert Wings CC
  ('a0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'CAPTAIN', true),
  ('a0000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'PLAYER',  true),
  ('a0000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'PLAYER',  true),
  ('a0000000-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'PLAYER',  true),
  ('a0000000-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'PLAYER',  true),
  ('a0000000-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000001', 'PLAYER',  true),
  ('a0000000-0000-0000-0000-000000000007', 'aaaaaaaa-0000-0000-0000-000000000001', 'PLAYER',  true),
  ('a0000000-0000-0000-0000-000000000008', 'aaaaaaaa-0000-0000-0000-000000000001', 'PLAYER',  true),
  ('a0000000-0000-0000-0000-000000000009', 'aaaaaaaa-0000-0000-0000-000000000001', 'PLAYER',  true),
  ('a0000000-0000-0000-0000-000000000010', 'aaaaaaaa-0000-0000-0000-000000000001', 'PLAYER',  true),
  ('a0000000-0000-0000-0000-000000000011', 'aaaaaaaa-0000-0000-0000-000000000001', 'PLAYER',  true),
  -- Marina Strikers CC
  ('b0000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'CAPTAIN', true),
  ('b0000000-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', 'PLAYER',  true),
  ('b0000000-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', 'PLAYER',  true),
  ('b0000000-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000001', 'PLAYER',  true),
  ('b0000000-0000-0000-0000-000000000005', 'bbbbbbbb-0000-0000-0000-000000000001', 'PLAYER',  true),
  ('b0000000-0000-0000-0000-000000000006', 'bbbbbbbb-0000-0000-0000-000000000001', 'PLAYER',  true),
  ('b0000000-0000-0000-0000-000000000007', 'bbbbbbbb-0000-0000-0000-000000000001', 'PLAYER',  true),
  ('b0000000-0000-0000-0000-000000000008', 'bbbbbbbb-0000-0000-0000-000000000001', 'PLAYER',  true),
  ('b0000000-0000-0000-0000-000000000009', 'bbbbbbbb-0000-0000-0000-000000000001', 'PLAYER',  true),
  ('b0000000-0000-0000-0000-000000000010', 'bbbbbbbb-0000-0000-0000-000000000001', 'PLAYER',  true),
  ('b0000000-0000-0000-0000-000000000011', 'bbbbbbbb-0000-0000-0000-000000000001', 'PLAYER',  true)
on conflict (user_id, team_id) do nothing;

-- ── STEP 4: Create the cricket match ──────────────────────────────────────
insert into public.matches (
  id, team_id, captain_id, title, sport, venue_name, venue_address,
  starts_at, payment_due_at, lock_at,
  squad_size, price_per_player, status, visibility, join_code
)
values (
  'cccccccc-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Desert Wings CC vs Marina Strikers CC',
  'Cricket',
  'MA Chidambaram Stadium Annex, Chennai',
  'Chepauk, Chennai, Tamil Nadu 600005',
  now() + interval '2 days',
  now() + interval '2 days' - interval '3 hours',
  now() + interval '2 days' - interval '1 hour',
  11,
  250,
  'LOCKED',
  'PUBLIC',
  'SEEDMATCH1'
)
on conflict (id) do nothing;

-- ── STEP 5: Add all 11 Desert Wings players as participants ────────────────
insert into public.participants (match_id, user_id, status, payment_status, joined_at)
values
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'LOCKED', 'PAID', now() - interval '1 day'),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'LOCKED', 'PAID', now() - interval '23 hours'),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'LOCKED', 'PAID', now() - interval '22 hours'),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'LOCKED', 'PAID', now() - interval '21 hours'),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'LOCKED', 'PAID', now() - interval '20 hours'),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', 'LOCKED', 'PAID', now() - interval '19 hours'),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007', 'LOCKED', 'PAID', now() - interval '18 hours'),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000008', 'LOCKED', 'PAID', now() - interval '17 hours'),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000009', 'LOCKED', 'PAID', now() - interval '16 hours'),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000010', 'LOCKED', 'PAID', now() - interval '15 hours'),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000011', 'LOCKED', 'PAID', now() - interval '14 hours')
on conflict (match_id, user_id) do nothing;

-- ── STEP 6: Payment records for all 11 players ────────────────────────────
insert into public.payments (match_id, user_id, amount, currency, status, paid_at)
values
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 250, 'INR', 'PAID', now() - interval '1 day'),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 250, 'INR', 'PAID', now() - interval '23 hours'),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 250, 'INR', 'PAID', now() - interval '22 hours'),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 250, 'INR', 'PAID', now() - interval '21 hours'),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 250, 'INR', 'PAID', now() - interval '20 hours'),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', 250, 'INR', 'PAID', now() - interval '19 hours'),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007', 250, 'INR', 'PAID', now() - interval '18 hours'),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000008', 250, 'INR', 'PAID', now() - interval '17 hours'),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000009', 250, 'INR', 'PAID', now() - interval '16 hours'),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000010', 250, 'INR', 'PAID', now() - interval '15 hours'),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000011', 250, 'INR', 'PAID', now() - interval '14 hours');

-- ── STEP 7: Strategy notes for the match ──────────────────────────────────
insert into public.strategy_notes (match_id, author_id, content, is_pinned)
values
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '📌 BATTING ORDER: Arjun (1), Vikram (2), Rahul (3), Priya (4), Karthik (5), Sneha (6), Dev (7), Meera (8), Ravi (9), Ananya (10), Siva (11)', true),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '🏏 BOWLING PLAN: Siva Kumar opens with swing. Ravi Sundaram first change. Dev Anand and Karthik share spin duties. Target: restrict to under 140.', false),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', '⚡ Field placements: Extra cover, mid-wicket, deep square leg for their openers. Their #4 likes to pull — set a fine leg.', false)
on conflict do nothing;

-- ── STEP 8: Match attendance (simulate post-match) ─────────────────────────
-- 9 attended, 2 no-shows (triggers reliability score update)
insert into public.match_attendance (match_id, user_id, status, recorded_by)
values
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'ATTENDED',   'a0000000-0000-0000-0000-000000000001'),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'ATTENDED',   'a0000000-0000-0000-0000-000000000001'),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'ATTENDED',   'a0000000-0000-0000-0000-000000000001'),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'ATTENDED',   'a0000000-0000-0000-0000-000000000001'),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'ATTENDED',   'a0000000-0000-0000-0000-000000000001'),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', 'ATTENDED',   'a0000000-0000-0000-0000-000000000001'),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007', 'ATTENDED',   'a0000000-0000-0000-0000-000000000001'),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000008', 'ATTENDED',   'a0000000-0000-0000-0000-000000000001'),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000009', 'ATTENDED',   'a0000000-0000-0000-0000-000000000001'),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000010', 'NO_SHOW',    'a0000000-0000-0000-0000-000000000001'),
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000011', 'NO_SHOW',    'a0000000-0000-0000-0000-000000000001')
on conflict (match_id, user_id) do nothing;

-- ── STEP 9: MOTM votes ─────────────────────────────────────────────────────
-- Vikram Sharma wins MOTM with 4 votes
insert into public.motm_votes (match_id, voter_id, nominee_id)
values
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002'),  -- Arjun votes Vikram
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002'),  -- Rahul votes Vikram
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002'),  -- Priya votes Vikram
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002'),  -- Karthik votes Vikram
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000006'),  -- Sneha votes herself (cheeky)
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000003'),  -- Dev votes Rahul
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000003'),  -- Meera votes Rahul
  ('cccccccc-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000002')   -- Ravi votes Vikram
on conflict (match_id, voter_id) do nothing;

-- ── STEP 10: Vendor — SportZone Chennai ────────────────────────────────────
insert into public.vendors (
  id, owner_id, name, category, description, city,
  lat, lng, contact_phone, contact_email,
  price_note, sports, is_verified, is_active, gst_number
)
values (
  'dddddddd-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',   -- owned by Arjun (captain doubles as vendor)
  'SEED: SportZone Chennai',
  'Kit',
  'Premium cricket and sports kit supplier. Custom jerseys, equipment, and gear for teams across Chennai. 48hr delivery guaranteed.',
  'Chennai',
  13.0827, 80.2707,   -- Chennai coords
  '+919876543210',
  'sportzone@example.com',
  'From ₹350/jersey · Bulk discounts available',
  array['Cricket','Football','Hockey'],
  true,
  true,
  '33AABCS1429B1ZX'
)
on conflict (id) do nothing;

-- ── STEP 11: Vendor products ────────────────────────────────────────────────
insert into public.vendor_products (
  id, vendor_id, name, description, category,
  price, unit, min_qty, stock, sport_tags, image_urls, is_active
)
values
  (
    'eeeeeeee-0000-0000-0000-000000000001',
    'dddddddd-0000-0000-0000-000000000001',
    'Custom Cricket Jersey (sublimation print)',
    'Full-sublimation polyester jersey with team name, numbers, and sponsor logo. Available in all sizes. 5-day delivery for bulk orders.',
    'Kit', 450, 'item', 11, 200,
    array['Cricket'], array[], true
  ),
  (
    'eeeeeeee-0000-0000-0000-000000000002',
    'dddddddd-0000-0000-0000-000000000001',
    'SG Club Cricket Ball (red, pack of 6)',
    'SG Club leather balls. Official weight and seam. Perfect for matches. 1-year warranty.',
    'Equipment', 1800, 'set', 1, 50,
    array['Cricket'], array[], true
  ),
  (
    'eeeeeeee-0000-0000-0000-000000000003',
    'dddddddd-0000-0000-0000-000000000001',
    'Match Day Hydration Pack (team of 11)',
    'Energy drinks, water bottles, electrolyte sachets — full hydration bundle for 11 players. Ice-packed delivery.',
    'Food', 850, 'set', 1, 30,
    array['Cricket','Football','Hockey'], array[], true
  ),
  (
    'eeeeeeee-0000-0000-0000-000000000004',
    'dddddddd-0000-0000-0000-000000000001',
    'Cricket Ground Marking Kit',
    'Boundary rope (75m), crease whitener, stumps (3 sets), bails. Complete ground setup kit.',
    'Equipment', 2200, 'set', 1, 15,
    array['Cricket'], array[], true
  )
on conflict (id) do nothing;

-- ── STEP 12: Team procurement list with items + votes + contributions ───────
insert into public.procurement_lists (id, team_id, title, created_by, status)
values (
  'ffffffff-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Match Day Kit & Supplies — Desert Wings CC',
  'a0000000-0000-0000-0000-000000000001',
  'OPEN'
)
on conflict (id) do nothing;

insert into public.procurement_items (id, list_id, vendor_id, product_id, name, estimated_cost, target_amount, collected_amount, created_by)
values
  -- Jerseys for the full squad
  ('f1f1f1f1-0000-0000-0000-000000000001',
   'ffffffff-0000-0000-0000-000000000001',
   'dddddddd-0000-0000-0000-000000000001',
   'eeeeeeee-0000-0000-0000-000000000001',
   'Custom jerseys × 11 (Desert Wings CC)', 4950, 4950, 3500,
   'a0000000-0000-0000-0000-000000000001'),
  -- Match balls
  ('f2f2f2f2-0000-0000-0000-000000000002',
   'ffffffff-0000-0000-0000-000000000001',
   'dddddddd-0000-0000-0000-000000000001',
   'eeeeeeee-0000-0000-0000-000000000002',
   'SG Club Balls (6-pack)', 1800, 1800, 1800,
   'a0000000-0000-0000-0000-000000000001'),
  -- Hydration pack
  ('f3f3f3f3-0000-0000-0000-000000000003',
   'ffffffff-0000-0000-0000-000000000001',
   'dddddddd-0000-0000-0000-000000000001',
   'eeeeeeee-0000-0000-0000-000000000003',
   'Match Day Hydration Pack', 850, 850, 400,
   'a0000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

-- Votes on items
insert into public.procurement_votes (item_id, user_id, vote)
values
  -- Jerseys — 9 NEEDED, 2 NOT_NEEDED
  ('f1f1f1f1-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'NEEDED'),
  ('f1f1f1f1-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'NEEDED'),
  ('f1f1f1f1-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'NEEDED'),
  ('f1f1f1f1-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'NEEDED'),
  ('f1f1f1f1-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'NEEDED'),
  ('f1f1f1f1-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', 'NEEDED'),
  ('f1f1f1f1-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007', 'NEEDED'),
  ('f1f1f1f1-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000008', 'NEEDED'),
  ('f1f1f1f1-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000009', 'NEEDED'),
  ('f1f1f1f1-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000010', 'NOT_NEEDED'),
  ('f1f1f1f1-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000011', 'NOT_NEEDED'),
  -- Balls — unanimous NEEDED
  ('f2f2f2f2-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'NEEDED'),
  ('f2f2f2f2-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'NEEDED'),
  ('f2f2f2f2-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'NEEDED'),
  ('f2f2f2f2-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'NEEDED'),
  ('f2f2f2f2-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', 'NEEDED'),
  -- Hydration — mixed votes
  ('f3f3f3f3-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'NEEDED'),
  ('f3f3f3f3-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'NEEDED'),
  ('f3f3f3f3-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'NEEDED'),
  ('f3f3f3f3-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', 'NOT_NEEDED'),
  ('f3f3f3f3-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 'NOT_NEEDED')
on conflict (item_id, user_id) do nothing;

-- Contributions (money pooled)
insert into public.procurement_contributions (item_id, user_id, amount, note)
values
  -- Jersey fund: ₹3500 of ₹4950 collected
  ('f1f1f1f1-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 500, 'Captain contribution'),
  ('f1f1f1f1-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 450, null),
  ('f1f1f1f1-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 450, null),
  ('f1f1f1f1-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 450, null),
  ('f1f1f1f1-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 450, null),
  ('f1f1f1f1-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', 450, null),
  ('f1f1f1f1-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007', 350, 'Will pay rest at ground'),
  ('f1f1f1f1-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000008', 400, null),
  -- Balls: fully funded ₹1800
  ('f2f2f2f2-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 600, 'Captain covers 1/3'),
  ('f2f2f2f2-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 600, null),
  ('f2f2f2f2-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 600, null),
  -- Hydration: partial ₹400 of ₹850
  ('f3f3f3f3-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 200, null),
  ('f3f3f3f3-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 200, null);

-- ── STEP 13: Availability check from captain ───────────────────────────────
insert into public.availability_checks (
  id, team_id, captain_id, match_date, match_time, venue_hint, note, expires_at
)
values (
  'a1a1a1a1-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  (now() + interval '7 days')::date,
  '07:00',
  'MA Chidambaram Annex',
  'Next league match — need full squad. Mark your availability ASAP!',
  now() + interval '5 days'
)
on conflict (id) do nothing;

-- Some responses to the availability check
insert into public.availability_responses (check_id, user_id, response, responded_at)
values
  ('a1a1a1a1-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'AVAILABLE',   now()),
  ('a1a1a1a1-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'AVAILABLE',   now()),
  ('a1a1a1a1-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'MAYBE',       now()),
  ('a1a1a1a1-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'UNAVAILABLE', now()),
  ('a1a1a1a1-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', 'AVAILABLE',   now()),
  ('a1a1a1a1-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007', 'AVAILABLE',   now())
on conflict (check_id, user_id) do nothing;

-- ── FINAL: Report what was created ────────────────────────────────────────
select 'SEED COMPLETE' as status,
  (select count(*) from public.users         where phone like 'seed-%')           as users_created,
  (select count(*) from public.teams         where slug  like 'seed-%')           as teams_created,
  (select count(*) from public.memberships   where team_id = 'aaaaaaaa-0000-0000-0000-000000000001') as team_a_members,
  (select count(*) from public.participants  where match_id = 'cccccccc-0000-0000-0000-000000000001') as match_participants,
  (select count(*) from public.payments      where match_id = 'cccccccc-0000-0000-0000-000000000001') as payments,
  (select count(*) from public.match_attendance where match_id = 'cccccccc-0000-0000-0000-000000000001') as attendance_records,
  (select count(*) from public.motm_votes    where match_id = 'cccccccc-0000-0000-0000-000000000001') as motm_votes,
  (select count(*) from public.vendor_products where vendor_id = 'dddddddd-0000-0000-0000-000000000001') as products,
  (select count(*) from public.procurement_contributions where item_id in ('f1f1f1f1-0000-0000-0000-000000000001','f2f2f2f2-0000-0000-0000-000000000002','f3f3f3f3-0000-0000-0000-000000000003')) as contributions,
  (select coalesce(sum(amount),0) from public.procurement_contributions where item_id in ('f1f1f1f1-0000-0000-0000-000000000001','f2f2f2f2-0000-0000-0000-000000000002','f3f3f3f3-0000-0000-0000-000000000003')) as total_pooled_inr;
