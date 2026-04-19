-- ─── Migration 011: Anonymous Poll Links & Player Claim Flow ────────────────
-- Enables zero-friction player experience:
-- Players click a link → see match → tap YES/NO → optionally claim payment
-- No login required for basic availability response

-- ── Poll link table (anonymous, token-based) ─────────────────────────────────
create table if not exists public.poll_links (
  id              uuid        primary key default gen_random_uuid(),
  check_id        uuid        references public.availability_checks (id) on delete cascade,
  match_id        uuid        references public.matches (id) on delete cascade,
  token           text        not null unique default public.generate_short_code() || public.generate_short_code(),
  name            text,           -- captain's label e.g. "Sunday 6am Turf"
  expires_at      timestamptz not null default (timezone('utc', now()) + interval '72 hours'),
  created_by      uuid        not null references public.users (id),
  created_at      timestamptz not null default timezone('utc', now())
);

create index if not exists poll_links_token_idx   on public.poll_links (token);
create index if not exists poll_links_check_idx   on public.poll_links (check_id);
create index if not exists poll_links_match_idx   on public.poll_links (match_id);

-- ── Anonymous responses (no user account needed) ─────────────────────────────
create table if not exists public.anon_responses (
  id              uuid        primary key default gen_random_uuid(),
  poll_link_id    uuid        not null references public.poll_links (id) on delete cascade,
  player_name     text        not null,
  player_phone    text,
  response        text        not null check (response in ('YES', 'NO', 'MAYBE')),
  payment_claimed boolean     not null default false,
  payment_note    text,
  user_id         uuid        references public.users (id),  -- set if they later log in
  ip_fingerprint  text,
  created_at      timestamptz not null default timezone('utc', now()),
  updated_at      timestamptz not null default timezone('utc', now())
);

create index if not exists anon_responses_poll_idx  on public.anon_responses (poll_link_id, response);
create index if not exists anon_responses_phone_idx on public.anon_responses (player_phone);

drop trigger if exists anon_responses_touch_updated_at on public.anon_responses;
create trigger anon_responses_touch_updated_at
  before update on public.anon_responses
  for each row execute function public.touch_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.poll_links      enable row level security;
alter table public.anon_responses  enable row level security;

-- poll_links: anyone can read by token (checked in app), only creator writes
drop policy if exists "poll_links_select_all"       on public.poll_links;
drop policy if exists "poll_links_insert_captain"   on public.poll_links;

create policy "poll_links_select_all" on public.poll_links
  for select to anon, authenticated using (true);

create policy "poll_links_insert_captain" on public.poll_links
  for insert to authenticated with check (created_by = auth.uid());

-- anon_responses: anyone can insert/update (token checked in app layer)
drop policy if exists "anon_responses_select_creator" on public.anon_responses;
drop policy if exists "anon_responses_insert_anon"    on public.anon_responses;
drop policy if exists "anon_responses_update_anon"    on public.anon_responses;

create policy "anon_responses_select_creator" on public.anon_responses
  for select to anon, authenticated using (true);

create policy "anon_responses_insert_anon" on public.anon_responses
  for insert to anon, authenticated with check (true);

create policy "anon_responses_update_anon" on public.anon_responses
  for update to anon, authenticated using (true);
