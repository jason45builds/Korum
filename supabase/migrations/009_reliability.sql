create table if not exists public.reliability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  participant_id uuid references public.match_participants (id) on delete cascade,
  attendance_score numeric(5, 2) not null default 100.00 check (attendance_score between 0 and 100),
  payment_score numeric(5, 2) not null default 100.00 check (payment_score between 0 and 100),
  dropout_penalty numeric(5, 2) not null default 0.00 check (dropout_penalty between 0 and 100),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, match_id)
);

create index if not exists reliability_user_idx on public.reliability (user_id);
create index if not exists reliability_match_idx on public.reliability (match_id);

drop trigger if exists reliability_touch_updated_at on public.reliability;
create trigger reliability_touch_updated_at
before update on public.reliability
for each row
execute function public.touch_updated_at();

create or replace function public.recalculate_user_reliability(p_user_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  recalculated_score numeric(5, 2);
begin
  select coalesce(
    avg(greatest(0, ((attendance_score + payment_score) / 2.0) - dropout_penalty)),
    100.00
  )
  into recalculated_score
  from public.reliability
  where user_id = p_user_id;

  update public.users
  set reliability_score = recalculated_score
  where id = p_user_id;

  return recalculated_score;
end;
$$;

create or replace function public.sync_reliability_to_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_user_reliability(old.user_id);
    return old;
  end if;

  perform public.recalculate_user_reliability(new.user_id);
  return new;
end;
$$;

drop trigger if exists reliability_sync_trigger on public.reliability;
create trigger reliability_sync_trigger
after insert or update or delete on public.reliability
for each row
execute function public.sync_reliability_to_user();

alter table public.reliability enable row level security;

drop policy if exists "reliability_select_actor" on public.reliability;
create policy "reliability_select_actor"
on public.reliability
for select
to authenticated
using (user_id = auth.uid() or public.is_match_actor(match_id));

drop policy if exists "reliability_insert_match_actor" on public.reliability;
create policy "reliability_insert_match_actor"
on public.reliability
for insert
to authenticated
with check (public.is_match_actor(match_id));

drop policy if exists "reliability_update_match_actor" on public.reliability;
create policy "reliability_update_match_actor"
on public.reliability
for update
to authenticated
using (public.is_match_actor(match_id))
with check (public.is_match_actor(match_id));
