create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  participant_id uuid references public.match_participants (id) on delete set null,
  amount numeric(10, 2) not null check (amount >= 0),
  currency text not null default 'INR',
  status public.payment_status not null default 'CREATED',
  gateway_order_id text,
  gateway_payment_id text,
  gateway_signature text,
  webhook_event_id text,
  receipt text not null,
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (match_id, user_id)
);

create unique index if not exists payments_receipt_idx on public.payments (receipt);
create unique index if not exists payments_gateway_order_idx
  on public.payments (gateway_order_id)
  where gateway_order_id is not null;
create unique index if not exists payments_gateway_payment_idx
  on public.payments (gateway_payment_id)
  where gateway_payment_id is not null;
create index if not exists payments_status_idx on public.payments (match_id, status);

drop trigger if exists payments_touch_updated_at on public.payments;
create trigger payments_touch_updated_at
before update on public.payments
for each row
execute function public.touch_updated_at();

create or replace function public.finalize_match_payment(
  p_match_id uuid,
  p_user_id uuid,
  p_payment_id uuid,
  p_gateway_order_id text,
  p_gateway_payment_id text,
  p_gateway_signature text,
  p_event_id text default null,
  p_paid_at timestamptz default timezone('utc', now())
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_payment public.payments;
  current_participant public.match_participants;
begin
  select *
  into current_payment
  from public.payments
  where id = p_payment_id
    and match_id = p_match_id
    and user_id = p_user_id
  for update;

  if current_payment.id is null then
    raise exception 'Payment record not found';
  end if;

  if current_payment.status = 'PAID'
     and coalesce(current_payment.gateway_payment_id, '') = coalesce(p_gateway_payment_id, '') then
    select *
    into current_participant
    from public.match_participants
    where match_id = p_match_id
      and user_id = p_user_id;

    return jsonb_build_object(
      'result', 'PAID',
      'participantStatus', coalesce(current_participant.status::text, 'UNKNOWN'),
      'paymentStatus', current_payment.status::text
    );
  end if;

  perform public.release_expired_participant_holds(p_match_id);

  select *
  into current_participant
  from public.match_participants
  where match_id = p_match_id
    and user_id = p_user_id
  for update;

  if current_participant.id is null then
    update public.payments
    set
      status = 'REFUND_PENDING',
      gateway_order_id = coalesce(p_gateway_order_id, gateway_order_id),
      gateway_payment_id = coalesce(p_gateway_payment_id, gateway_payment_id),
      gateway_signature = coalesce(p_gateway_signature, gateway_signature),
      webhook_event_id = coalesce(webhook_event_id, p_event_id),
      paid_at = coalesce(paid_at, p_paid_at),
      updated_at = timezone('utc', now())
    where id = current_payment.id
    returning *
    into current_payment;

    return jsonb_build_object(
      'result', 'REFUND_PENDING',
      'reason', 'participant_missing',
      'paymentStatus', current_payment.status::text
    );
  end if;

  if current_participant.status in ('CONFIRMED', 'LOCKED') then
    update public.payments
    set
      status = 'PAID',
      gateway_order_id = coalesce(p_gateway_order_id, gateway_order_id),
      gateway_payment_id = coalesce(p_gateway_payment_id, gateway_payment_id),
      gateway_signature = coalesce(p_gateway_signature, gateway_signature),
      webhook_event_id = coalesce(webhook_event_id, p_event_id),
      paid_at = coalesce(paid_at, p_paid_at),
      updated_at = timezone('utc', now())
    where id = current_payment.id
    returning *
    into current_payment;

    return jsonb_build_object(
      'result', 'PAID',
      'participantStatus', current_participant.status::text,
      'paymentStatus', current_payment.status::text
    );
  end if;

  begin
    update public.match_participants
    set
      status = 'CONFIRMED',
      payment_status = 'PAID',
      hold_expires_at = null,
      updated_at = timezone('utc', now())
    where id = current_participant.id
    returning *
    into current_participant;

    update public.payments
    set
      status = 'PAID',
      gateway_order_id = coalesce(p_gateway_order_id, gateway_order_id),
      gateway_payment_id = coalesce(p_gateway_payment_id, gateway_payment_id),
      gateway_signature = coalesce(p_gateway_signature, gateway_signature),
      webhook_event_id = coalesce(webhook_event_id, p_event_id),
      paid_at = coalesce(paid_at, p_paid_at),
      updated_at = timezone('utc', now())
    where id = current_payment.id
    returning *
    into current_payment;

    return jsonb_build_object(
      'result', 'CONFIRMED',
      'participantStatus', current_participant.status::text,
      'paymentStatus', current_payment.status::text
    );
  exception
    when others then
      update public.match_participants
      set
        status = 'WAITLISTED',
        payment_status = 'REFUND_PENDING',
        hold_expires_at = null,
        updated_at = timezone('utc', now())
      where id = current_participant.id
      returning *
      into current_participant;

      update public.payments
      set
        status = 'REFUND_PENDING',
        gateway_order_id = coalesce(p_gateway_order_id, gateway_order_id),
        gateway_payment_id = coalesce(p_gateway_payment_id, gateway_payment_id),
        gateway_signature = coalesce(p_gateway_signature, gateway_signature),
        webhook_event_id = coalesce(webhook_event_id, p_event_id),
        paid_at = coalesce(paid_at, p_paid_at),
        updated_at = timezone('utc', now())
      where id = current_payment.id
      returning *
      into current_payment;

      return jsonb_build_object(
        'result', 'REFUND_PENDING',
        'participantStatus', current_participant.status::text,
        'paymentStatus', current_payment.status::text
      );
  end;
end;
$$;

alter table public.payments enable row level security;

drop policy if exists "payments_select_actor" on public.payments;
create policy "payments_select_actor"
on public.payments
for select
to authenticated
using (public.is_match_actor(match_id) or user_id = auth.uid());

drop policy if exists "payments_insert_self" on public.payments;
create policy "payments_insert_self"
on public.payments
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "payments_update_self_or_captain" on public.payments;
create policy "payments_update_self_or_captain"
on public.payments
for update
to authenticated
using (user_id = auth.uid() or public.is_match_actor(match_id))
with check (user_id = auth.uid() or public.is_match_actor(match_id));
