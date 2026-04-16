create table if not exists public.match_invites (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  invited_user_id uuid references public.users (id) on delete set null,
  invited_phone text not null,
  invited_name text,
  invited_by uuid not null references public.users (id) on delete restrict,
  token text not null unique default public.generate_short_code() || public.generate_short_code(),
  status public.invite_status not null default 'PENDING',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists match_invites_match_idx on public.match_invites (match_id, status);
create index if not exists match_invites_phone_idx on public.match_invites (invited_phone);

drop trigger if exists match_invites_touch_updated_at on public.match_invites;
create trigger match_invites_touch_updated_at
before update on public.match_invites
for each row
execute function public.touch_updated_at();

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'match_participants_invite_id_fkey'
      and table_name = 'match_participants'
      and table_schema = 'public'
  ) then
    alter table public.match_participants
    add constraint match_participants_invite_id_fkey
      foreign key (invite_id) references public.match_invites (id) on delete set null;
  end if;
end
$$;

create or replace function public.expire_match_invites(p_match_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_rows integer;
begin
  update public.match_invites
  set
    status = 'EXPIRED',
    updated_at = timezone('utc', now())
  where status = 'PENDING'
    and expires_at <= timezone('utc', now())
    and (p_match_id is null or match_id = p_match_id);

  get diagnostics affected_rows = row_count;
  return affected_rows;
end;
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

alter table public.match_invites enable row level security;

drop policy if exists "match_invites_select_actor" on public.match_invites;
create policy "match_invites_select_actor"
on public.match_invites
for select
to authenticated
using (
  public.is_match_actor(match_id)
  or invited_user_id = auth.uid()
);

drop policy if exists "match_invites_insert_match_actor" on public.match_invites;
create policy "match_invites_insert_match_actor"
on public.match_invites
for insert
to authenticated
with check (public.is_match_actor(match_id));

drop policy if exists "match_invites_update_match_actor" on public.match_invites;
create policy "match_invites_update_match_actor"
on public.match_invites
for update
to authenticated
using (public.is_match_actor(match_id) or invited_user_id = auth.uid())
with check (public.is_match_actor(match_id) or invited_user_id = auth.uid());
