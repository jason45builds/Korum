-- Migration 015: UPI columns on users + notifications table + messages table
-- Run this in Supabase SQL Editor

-- ── UPI fields on users (safe to add even if already present) ───────────────
alter table public.users
  add column if not exists upi_id   text,
  add column if not exists upi_name text;

-- ── Notifications ────────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.users(id) on delete cascade,
  type        text        not null, -- 'payment_claimed','player_joined','match_locked','availability_check','match_reminder'
  title       text        not null,
  body        text,
  match_id    uuid        references public.matches(id) on delete cascade,
  team_id     uuid        references public.teams(id) on delete cascade,
  is_read     boolean     not null default false,
  created_at  timestamptz not null default timezone('utc', now())
);
create index if not exists notif_user_idx on public.notifications(user_id, is_read, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "notif_select_self" on public.notifications;
drop policy if exists "notif_update_self" on public.notifications;
create policy "notif_select_self" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "notif_update_self" on public.notifications
  for update to authenticated using (user_id = auth.uid());

-- ── Match messages (simple chat per match) ───────────────────────────────────
create table if not exists public.match_messages (
  id          uuid        primary key default gen_random_uuid(),
  match_id    uuid        not null references public.matches(id) on delete cascade,
  author_id   uuid        not null references public.users(id) on delete cascade,
  content     text        not null check (char_length(content) between 1 and 1000),
  created_at  timestamptz not null default timezone('utc', now())
);
create index if not exists msg_match_idx on public.match_messages(match_id, created_at asc);
alter table public.match_messages enable row level security;
drop policy if exists "msg_select_participant" on public.match_messages;
drop policy if exists "msg_insert_participant" on public.match_messages;
create policy "msg_select_participant" on public.match_messages
  for select to authenticated using (public.is_match_actor(match_id));
create policy "msg_insert_participant" on public.match_messages
  for insert to authenticated with check (author_id = auth.uid() and public.is_match_actor(match_id));
