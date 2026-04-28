-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 021: Razorpay Payment Integration Hardening
-- Adds missing columns, fixes constraints, adds platform fee tracking
-- ═══════════════════════════════════════════════════════════════════════════

-- Add platform_fee column to track Korum's 2% cut per transaction
alter table public.payments
  add column if not exists platform_fee   numeric(10,2) not null default 0,
  add column if not exists match_fee      numeric(10,2),
  add column if not exists refunded_at    timestamptz,
  add column if not exists refund_id      text,
  add column if not exists failure_reason text;

-- Add comment for clarity
comment on column public.payments.platform_fee is
  'Korum platform fee (2% of match fee). Collected via Razorpay, reconciled separately.';
comment on column public.payments.match_fee is
  'Base match fee set by captain. platform_fee is added on top for player-facing amount.';

-- Backfill match_fee from amount for existing rows (approximation: match_fee ≈ amount / 1.02)
update public.payments
set match_fee = round(amount / 1.02, 2)
where match_fee is null and amount > 0;

-- payment_status enum — add REFUND_PENDING if not already there
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumtypid = 'public.payment_status'::regtype
      and enumlabel = 'REFUND_PENDING'
  ) then
    alter type public.payment_status add value 'REFUND_PENDING';
  end if;

  if not exists (
    select 1 from pg_enum
    where enumtypid = 'public.payment_status'::regtype
      and enumlabel = 'REFUNDED'
  ) then
    alter type public.payment_status add value 'REFUNDED';
  end if;
end $$;

-- Index for webhook reconciliation (order_id lookup)
create index if not exists payments_gateway_order_lookup
  on public.payments (gateway_order_id)
  where gateway_order_id is not null;

-- Platform fee revenue view — useful for reconciliation dashboard
create or replace view public.korum_revenue as
select
  date_trunc('month', paid_at)          as month,
  count(*)                              as paid_transactions,
  sum(platform_fee)                     as platform_fee_total,
  sum(match_fee)                        as match_fee_total,
  sum(amount)                           as gross_collected,
  round(avg(platform_fee), 2)           as avg_fee_per_txn
from public.payments
where status = 'PAID'
  and paid_at is not null
group by 1
order by 1 desc;

-- Captain revenue summary — how much each captain's matches collected
create or replace view public.captain_payment_summary as
select
  m.captain_id,
  u.display_name                        as captain_name,
  count(distinct m.id)                  as total_matches,
  count(p.id)                           as total_payments,
  sum(p.match_fee)                      as total_match_fees,
  sum(p.platform_fee)                   as total_platform_fees,
  min(p.paid_at)                        as first_payment,
  max(p.paid_at)                        as latest_payment
from public.matches m
join public.users u on u.id = m.captain_id
left join public.payments p on p.match_id = m.id and p.status = 'PAID'
group by m.captain_id, u.display_name
order by total_match_fees desc nulls last;
