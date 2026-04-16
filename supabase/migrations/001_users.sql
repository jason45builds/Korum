create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'membership_role') then
    create type public.membership_role as enum ('CAPTAIN', 'PLAYER');
  end if;

  if not exists (select 1 from pg_type where typname = 'match_state') then
    create type public.match_state as enum ('DRAFT', 'RSVP_OPEN', 'PAYMENT_PENDING', 'LOCKED', 'READY');
  end if;

  if not exists (select 1 from pg_type where typname = 'match_visibility') then
    create type public.match_visibility as enum ('PRIVATE', 'TEAM', 'PUBLIC');
  end if;

  if not exists (select 1 from pg_type where typname = 'participant_status') then
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
  end if;

  if not exists (select 1 from pg_type where typname = 'invite_status') then
    create type public.invite_status as enum ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum (
      'CREATED',
      'PENDING',
      'PAID',
      'FAILED',
      'REFUND_PENDING',
      'REFUNDED'
    );
  end if;
end
$$;

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

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text not null unique,
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

create index if not exists users_phone_idx on public.users (phone);
create index if not exists users_role_idx on public.users (role);

drop trigger if exists users_touch_updated_at on public.users;
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
  derived_phone text;
  derived_name text;
begin
  derived_phone := coalesce(new.phone, new.raw_user_meta_data ->> 'phone', '');
  derived_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    split_part(derived_phone, '@', 1),
    derived_phone
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
    derived_phone,
    derived_name,
    derived_name,
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'default_sport',
    new.raw_user_meta_data ->> 'city'
  )
  on conflict (id) do update
  set
    phone = excluded.phone,
    full_name = excluded.full_name,
    display_name = excluded.display_name,
    avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url),
    default_sport = coalesce(excluded.default_sport, public.users.default_sport),
    city = coalesce(excluded.city, public.users.city),
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_synced on auth.users;
create trigger on_auth_user_synced
after insert or update on auth.users
for each row
execute function public.sync_auth_user_to_profile();

alter table public.users enable row level security;

drop policy if exists "users_select_self" on public.users;
create policy "users_select_self"
on public.users
for select
to authenticated
using (id = auth.uid());

drop policy if exists "users_update_self" on public.users;
create policy "users_update_self"
on public.users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());
