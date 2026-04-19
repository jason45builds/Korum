-- ─── Migration 011: Guest Participants ──────────────────────────────────────
-- Allows anonymous players to join matches via public WhatsApp links
-- without needing to create an account. Captain confirms/rejects them.

create table if not exists public.guest_participants (
  id              uuid        primary key default gen_random_uuid(),
  match_id        uuid        not null references public.matches (id) on delete cascade,
  display_name    text        not null,
  phone           text,
  status          text        not null default 'PENDING_PAYMENT'
                              check (status in ('PENDING_PAYMENT', 'CLAIMED_PAID', 'CONFIRMED', 'REJECTED', 'CANT_PLAY')),
  claimed_paid_at timestamptz,
  confirmed_at    timestamptz,
  note            text,
  created_at      timestamptz not null default timezone('utc', now()),
  updated_at      timestamptz not null default timezone('utc', now())
);

create index if not exists guest_match_idx  on public.guest_participants (match_id, status);
create index if not exists guest_phone_idx  on public.guest_participants (phone) where phone is not null;

drop trigger if exists guest_touch_updated_at on public.guest_participants;
create trigger guest_touch_updated_at
  before update on public.guest_participants
  for each row execute function public.touch_updated_at();

-- RLS: captain can see all guests for their match, anyone can insert
alter table public.guest_participants enable row level security;

drop policy if exists "guest_insert_anon"   on public.guest_participants;
drop policy if exists "guest_select_captain" on public.guest_participants;
drop policy if exists "guest_update_captain" on public.guest_participants;

-- Anyone can insert (anonymous join)
create policy "guest_insert_anon" on public.guest_participants
  for insert with check (true);

-- Captain and match actors can view
create policy "guest_select_captain" on public.guest_participants
  for select to authenticated
  using (public.is_match_actor(match_id));

-- Captain can update (confirm/reject)
create policy "guest_update_captain" on public.guest_participants
  for update to authenticated
  using (public.is_match_actor(match_id));

-- Allow anonymous updates (player claiming payment)
create policy "guest_update_anon" on public.guest_participants
  for update using (true) with check (true);
